/* ═══════════════════════════════════════════════════════════════
   SEQUENT — Service Worker (service-worker.js)
   Cache-first offline support
   ═══════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'sequent-cache-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Install Event
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching all local shell assets');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Intercept Event
self.addEventListener('fetch', e => {
  // Only intercept HTTP/S requests
  if (!e.request.url.startsWith('http')) return;

  // Skip API calls (Gemini, Tomorrow.io, Supabase) - fetch dynamically
  if (
    e.request.url.includes('generativelanguage.googleapis.com') ||
    e.request.url.includes('api.tomorrow.io') ||
    e.request.url.includes('supabase.co')
  ) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Navigations / HTML: network-first so new deploys are picked up,
  // falling back to the cached shell when offline
  if (
    e.request.mode === 'navigate' ||
    (e.request.headers.get('accept') || '').includes('text/html')
  ) {
    e.respondWith(
      fetch(e.request).then(response => {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, responseToCache);
        });
        return response;
      }).catch(() => {
        return caches.match(e.request).then(cachedResponse => {
          return cachedResponse || caches.match('./index.html');
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(e.request).then(response => {
        // Cache Google Fonts stylesheet and fonts dynamically
        if (
          e.request.url.includes('fonts.googleapis.com') ||
          e.request.url.includes('fonts.gstatic.com')
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, responseToCache);
          });
        }
        // Cache hashed Vite build assets (same-origin GET, /assets/) dynamically
        if (
          e.request.method === 'GET' &&
          e.request.url.startsWith(self.location.origin) &&
          new URL(e.request.url).pathname.includes('/assets/') &&
          response.ok
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, responseToCache);
          });
        }
        return response;
      });
    }).catch(() => {
      // Fallback for HTML pages when network is down
      if ((e.request.headers.get('accept') || '').includes('text/html')) {
        return caches.match('./index.html');
      }
    })
  );
});
