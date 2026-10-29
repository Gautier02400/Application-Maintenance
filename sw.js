/* ============================================================================
   sw.js : "SERVICE WORKER" de l'appli Tutos Maintenance (Sibelco)
   ----------------------------------------------------------------------------
   Un service worker est un petit programme que le navigateur garde en arrière-plan.
   Ici il sert à 2 choses :
     1) garder une copie des fichiers de l'appli (le "cache") pour qu'elle s'ouvre HORS CONNEXION ;
     2) permettre l'installation de l'appli comme une vraie application (PWA).
   ============================================================================ */

// Nom du cache. IMPORTANT : à chaque fois que vous modifiez index.html (ou un autre fichier de la liste),
// changez ce numéro (v17 -> v18...) pour que les appareils suppriment l'ancienne copie et récupèrent la nouvelle.
const CACHE = 'tutos-maintenance-v17';

// Fichiers de l'appli à mettre en cache dès l'installation (ils doivent tous exister dans le dossier).
// Ajoutez ici "./fond-verre.jpg" si vous utilisez une photo de fond.
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

// Bibliothèques externes : pdf.js (affichage des PDF) et JSZip (lecture des PowerPoint .pptx).
// Mises en cache "si possible" : si Internet manque pendant l'installation, ça ne bloque pas l'appli.
// (Le logo 3D, lui, est dessiné par l'appli elle-même : aucune bibliothèque à télécharger.)
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
      .then(c => c.addAll(FILES).then(() => Promise.allSettled(CDN.map(u => c.add(u)))))
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

// REQUETES : "réseau d'abord, avec délai limite".
//   - Internet répond vite : on sert la version la plus récente et on en garde une copie.
//   - Internet absent ou trop lent (> 4 s) : on sert la copie du cache (ou index.html à défaut).
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !/^https?:/.test(req.url)) return;
  e.respondWith((async () => {
    const net = fetch(req).then(r => {
      if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
      return r;
    });
    const fromCache = async () => (await caches.match(req)) || (req.mode === 'navigate' ? await caches.match('./index.html') : undefined);
    try {
      return await Promise.race([net, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), NETWORK_TIMEOUT_MS))]);
    } catch (err) {
      const hit = await fromCache();
      if (hit) return hit;
      return net;           // rien en cache : on attend quand même la réponse d'Internet
    }
  })());
});
