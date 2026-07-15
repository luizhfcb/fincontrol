const CACHE_NAME = 'fincontrol-static-57c2e00b';
const GOOGLE_HOSTS = ['firebase', 'gstatic', 'googleapis', 'google.com'];

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './assets/fonts/poppins.css',
  './icon-192.svg',
  './icon-512.svg',
  './css/main.css',
  './js/main.js',
  './js/config/firebase.js',
  './js/core/constants.js',
  './js/core/dates.js',
  './js/core/feedback-validation.mjs',
  './js/core/local-date.mjs',
  './js/core/state.js',
  './js/core/subscription-sync.mjs',
  './js/core/utils.js',
  './js/services/auth.js',
  './js/services/audio.js',
  './js/services/feedback.js',
  './js/services/theme.js',
  './js/services/transactions.js',
  './js/ui/categories.js',
  './js/ui/charts.js',
  './js/ui/desktop-module-templates.mjs',
  './js/ui/feedback.js',
  './js/ui/feedback-modal.js',
  './js/ui/heatmap.js',
  './js/ui/layout.js',
  './js/ui/mobile-module-templates.mjs',
  './js/ui/modal.js',
  './js/ui/modules.js',
  './js/ui/navigation.js',
  './js/ui/onboarding.js',
  './js/ui/render.js',
  './js/ui/tx-history.js',
  './js/ui/tx-list.js',
  './js/ui/tx-swipe.js',
  './js/ui/ui-helpers.js',
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

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const clonedResponse = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(new URL('./index.html', self.location).toString(), clonedResponse));
          return networkResponse;
        })
        .catch(() => caches.match(new URL('./index.html', self.location).toString())),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200 || request.url.startsWith('chrome-extension://')) {
              return;
            }

            const clonedResponse = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clonedResponse));
          })
          .catch(() => {});

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
        });
    }),
  );
});
