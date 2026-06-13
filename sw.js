const CACHE = 'nova-v4';
const APP_SHELL = [
  '/', '/index.html', '/health.html', '/finance.html', '/po-coach.html', '/productivity.html', '/library.html',
  '/topbar.js', '/manifest.json',
  '/nova_icon.png', '/icon-192.png', '/icon-256.png', '/icon-384.png', '/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_SHELL)));
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
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
