const CACHE = 'nova-v14';
const ASSETS = [
  '/', '/topbar.js', '/manifest.json',
  '/nova_icon.png', '/icon-192.png', '/icon-256.png', '/icon-384.png', '/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return;

  // Navigation: network-first, fall back to index.html (SPA shell) for 404s
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (!res.ok && res.status === 404) {
            return caches.match('/index.html') || fetch('/index.html');
          }
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html') || caches.match(e.request))
    );
    return;
  }

  // Static assets: cache-first for performance
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }))
  );
});
