const CACHE = 'pwa-demo-v1';
const FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', evt => {
  self.skipWaiting();
  evt.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
});

self.addEventListener('activate', evt => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', evt => {
  // strategy: cache-first for app shell, network fallback
  if(evt.request.method !== 'GET') return;
  evt.respondWith(
    caches.match(evt.request).then(cached => {
      if(cached) return cached;
      return fetch(evt.request).then(resp => {
        // optional: cache new requests for offline
        return caches.open(CACHE).then(cache => {
          try { cache.put(evt.request, resp.clone()); } catch(e) {}
          return resp;
        });
      }).catch(()=> {
        // offline fallback for navigation
        if(evt.request.mode === 'navigate') return caches.match('./');
      });
    })
  );
});
