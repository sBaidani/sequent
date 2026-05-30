/* ═══════════════════════════════════════════════════════════════
   SEQUENT — Service Worker (service-worker.js)
   Cache-first offline support
   ═══════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'sequent-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
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
        return response;
      });
    }).catch(() => {
      // Fallback for HTML pages when network is down
      if (e.request.headers.get('accept').includes('text/html')) {
        return caches.match('./index.html');
      }
    })
  );
});
