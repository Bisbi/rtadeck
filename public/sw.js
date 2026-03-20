const CACHE = 'rtadeck-v3';
const PRECACHE = ['/', '/css/style.css', '/js/app.js', '/js/api.js', '/js/grid.js', '/js/button.js', '/js/pages.js', '/js/editor.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never cache API calls or WebSocket
  if (url.pathname.startsWith('/api/') || e.request.headers.get('upgrade') === 'websocket') {
    return;
  }

  e.respondWith(
    fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
