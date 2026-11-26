/* ============================================================================
   sw.js : "SERVICE WORKER" de l'appli Tutos Maintenance (Sibelco)
   ----------------------------------------------------------------------------
   Un service worker est un petit programme que le navigateur garde en arrière-plan.
   Ici il sert à 2 choses :
     1) garder une copie des fichiers de l'appli (le "cache") pour qu'elle s'ouvre HORS CONNEXION ;
     2) permettre l'installation de l'appli comme une vraie application (PWA).
   ============================================================================ */

// Nom du cache. IMPORTANT : à chaque fois que vous modifiez index.html, app.js, style.css (ou un autre fichier de la liste),
// changez ce numéro pour que les appareils affichent « Nouvelle version disponible ».
// Le plus simple : lancez le script  maj-version.ps1  (clic droit > Exécuter avec PowerShell) qui augmente le numéro tout seul.
const CACHE = 'tutos-maintenance-v64';

// Fichiers de l'appli à mettre en cache dès l'installation (ils doivent tous exister dans le dossier).
const FILES = ['./', './index.html', './style.css', './app.js', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

// Fichiers OPTIONNELS : mis en cache si présents. Si l'un d'eux manque (flowsheet retiré, pas de bibliothèque locale...),
// cela ne bloque PAS l'installation de l'appli.
const OPTIONAL = [
  // Flowsheets interactifs (un fichier .js par site : plan + équipements)
  './flowsheets/saint-romain.js', './flowsheets/Reims.js',
  // Données partagées (Paramètres > Exporter pour le site, publiées sur Git)
  './donnees.json',
  // Photo de fond du site (Paramètres > Fond d'écran)
  './fond-verre.jpg',
  // Copies locales des bibliothèques (dossier lib/, facultatif : sinon on passe par le CDN ci-dessous)
  './lib/pdf.min.js', './lib/pdf.worker.min.js', './lib/jszip.min.js', './lib/qrcode.min.js',
  // Visionneuse 3D et modèles Blender (.glb)
  './lib/model-viewer.min.js', './modeles3d/redwave.glb', './modeles3d/binder-clarity.glb', './modeles3d/mogensen.glb'];

// Bibliothèques externes : pdf.js (affichage des PDF) et JSZip (lecture des PowerPoint .pptx).
// Mises en cache "si possible" : si Internet manque pendant l'installation, ça ne bloque pas l'appli.
const CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

// Au-delà de ce délai sans réponse d'Internet (réseau d'usine lent, wifi faible), on sert la copie du cache.
const NETWORK_TIMEOUT_MS = 4000;

// INSTALLATION : téléchargement des fichiers ci-dessus. skipWaiting() = la nouvelle version prend la place
// de l'ancienne sans attendre la fermeture des onglets (l'appli affiche alors "Nouvelle version disponible").
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(FILES).then(() => Promise.allSettled(OPTIONAL.concat(CDN).map(u => c.add(u)))))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATION : suppression des anciens caches puis prise de contrôle des pages ouvertes.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// On ne garde en cache QUE les fichiers de l'appli (même site) et les 3 bibliothèques ci-dessus.
// Tout le reste (sites externes, liens ouverts depuis l'appli...) passe directement par Internet : le cache ne grossit pas sans fin.
const cacheable = url => url.origin === self.location.origin || CDN.includes(url.href);

// REQUETES : "réseau d'abord, avec délai limite".
//   - Internet répond vite : on sert la version la plus récente et on en garde une copie.
//   - Internet absent ou trop lent (> 4 s) : on sert la copie du cache (ou index.html à défaut).
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !/^https?:/.test(req.url)) return;
  const url = new URL(req.url);
  if (!cacheable(url)) return;                     // laissé au navigateur, sans passer par le cache
  const nav = req.mode === 'navigate';
  e.respondWith((async () => {
    const net = fetch(req).then(r => {
      if (r && r.ok && r.type !== 'opaque') { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
      return r;
    });
    // ignoreSearch pour les pages : "index.html?source=pwa" retrouve bien la copie de "index.html"
    const fromCache = async () => (await caches.match(req, { ignoreSearch: nav })) || (nav ? await caches.match('./index.html') : undefined);
    let timer;
    try {
      return await Promise.race([net, new Promise((_, no) => { timer = setTimeout(() => no(new Error('timeout')), NETWORK_TIMEOUT_MS); })]);
    } catch (err) {
      const hit = await fromCache();
      if (hit) return hit;
      return net;           // rien en cache : on attend quand même la réponse d'Internet
    } finally { clearTimeout(timer); }
  })());
});
