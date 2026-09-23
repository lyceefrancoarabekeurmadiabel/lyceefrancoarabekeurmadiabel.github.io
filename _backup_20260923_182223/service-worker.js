// Service worker du site LFAKM
// Rôle : rendre le site "installable" comme une application, et garder en cache
// la coquille des pages déjà visitées pour un accès partiellement hors-ligne.
// Stratégie "réseau en priorité" : on va TOUJOURS chercher la dernière version
// en ligne d'abord ; le cache ne sert de secours QUE si l'appareil est hors-ligne.
// Ne touche JAMAIS aux données dynamiques (Firestore, Cloudinary) qui doivent
// toujours venir du réseau pour rester à jour.

const CACHE_NAME = 'lfakm-cache-v2';

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
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request)) // hors-ligne seulement : on retombe sur le cache
  );
});

