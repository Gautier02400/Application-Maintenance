/* ============================================================================
   sw.js : "SERVICE WORKER" de l'appli Tutos Maintenance
   ----------------------------------------------------------------------------
   Un service worker est un petit programme que le navigateur garde en arrière-plan.
   Ici il sert à 2 choses :
     1) garder une copie des fichiers de l'appli (le "cache") pour qu'elle s'ouvre HORS CONNEXION ;
     2) permettre l'installation de l'appli comme une vraie application (PWA).
   ============================================================================ */

// Nom du cache. IMPORTANT : à chaque fois que vous modifiez index.html (ou un autre fichier de la liste),
// changez ce numéro (v3 -> v4...) pour que les appareils suppriment l'ancienne copie et récupèrent la nouvelle.
const CACHE = 'tutos-maintenance-v7';

// Fichiers de l'appli à mettre en cache dès l'installation (si l'un manque, l'installation échoue :
// ils doivent donc tous exister dans le dossier). Ajoutez ici "./fond-verre.jpg" si vous utilisez une photo de fond.
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

// Bibliothèques externes : pdf.js (affichage des PDF en pleine page) et JSZip (lecture des PowerPoint .pptx).
// Elles sont mises en cache "si possible" : si Internet manque pendant l'installation, ça ne bloque pas l'appli.
const CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

// INSTALLATION : le navigateur télécharge et range les fichiers ci-dessus dans le cache.
// skipWaiting() = la nouvelle version prend la place de l'ancienne sans attendre la fermeture de tous les onglets.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(FILES).then(() => Promise.allSettled(CDN.map(u => c.add(u)))))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATION : on supprime les anciens caches (autres noms que CACHE) puis on prend le contrôle des pages ouvertes.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// REQUETES : stratégie "réseau d'abord".
//   - Avec Internet : on télécharge la version la plus récente et on en garde une copie dans le cache.
//   - Sans Internet : on sert la copie du cache (ou index.html à défaut).
// Seules les requêtes GET sont gérées (lecture de fichiers).
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
