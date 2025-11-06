const CACHE_NAME = 'discount-cards-static-v1';
const OFFLINE_URLS = [
  '/',
  '/index.html',
  '/favicon.ico',
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js',
  'https://cdn.jsdelivr.net/npm/qrcodejs/qrcode.min.js',
  'https://telegram.org/js/telegram-web-app.js'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(self.clients.claim());
});

// fetch handler: prefer network for API, cache-first for static assets
self.addEventListener('fetch', (evt) => {
  const req = evt.request;
  const url = new URL(req.url);

  // API requests -> network first (so changes propagate). If network fails -> respond 503.
  if (url.pathname.startsWith('/api/')) {
    evt.respondWith(
      fetch(req).catch(() => new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }

  // otherwise: cache-first
  evt.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        // cache GET requests (same-origin)
        if (req.method === 'GET' && resp && resp.status === 200 && resp.type !== 'opaque') {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return resp;
      }).catch(()=> {
        // if request is navigation, return cached index.html
        if (req.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('', { status: 504 });
      });
    })
  );
});
