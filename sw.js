const CACHE_NAME = 'fincontrol-static-v2';
const GOOGLE_HOSTS = ['firebase', 'gstatic', 'googleapis', 'google.com'];

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  './css/main.css',
  './js/main.js',
  './js/config/firebase.js',
  './js/core/constants.js',
  './js/core/state.js',
  './js/core/utils.js',
  './js/services/auth.js',
  './js/services/audio.js',
  './js/services/theme.js',
  './js/services/transactions.js',
  './js/ui/categories.js',
  './js/ui/feedback.js',
  './js/ui/layout.js',
  './js/ui/modal.js',
  './js/ui/navigation.js',
  './js/ui/render.js',
].map((asset) => new URL(asset, self.location).toString());

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  if (GOOGLE_HOSTS.some((host) => request.url.includes(host))) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || request.url.startsWith('chrome-extension://')) {
            return networkResponse;
          }

          const clonedResponse = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clonedResponse));
          return networkResponse;
        })
        .catch(() => cachedResponse);
    }),
  );
});
