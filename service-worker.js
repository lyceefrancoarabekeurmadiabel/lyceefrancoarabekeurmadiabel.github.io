// Service worker du site LFAKM
// Rôle : rendre le site "installable" comme une application, et garder en cache
// la coquille des pages déjà visitées pour un accès plus rapide / partiellement hors-ligne.
// Ne touche JAMAIS aux données dynamiques (Firestore, Cloudinary) qui doivent
// toujours venir du réseau pour rester à jour.

const CACHE_NAME = 'lfakm-cache-v1';

const urlsToCache = [
  'index.html',
  'ressources.html',
  'identification.html',
  'inscription.html',
  'actualites.html',
  'historique.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch((err) => console.warn('Cache initial partiel :', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // On ne met JAMAIS en cache : Firebase/Firestore/Auth, Cloudinary, Google APIs,
  // ni les requêtes non-GET (envoi de formulaires, uploads...).
  // Ces données doivent toujours être fraîches, jamais servies depuis un cache local.
  if (
    event.request.method !== 'GET' ||
    url.includes('firestore.googleapis.com') ||
    url.includes('googleapis.com') ||
    url.includes('firebaseapp.com') ||
    url.includes('cloudinary.com') ||
    url.includes('gstatic.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // hors-ligne : on retombe sur la version en cache si elle existe

      return cached || networkFetch;
    })
  );
});
