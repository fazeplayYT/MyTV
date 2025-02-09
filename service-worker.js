const CACHE_NAME = "pwa-cache-v1";
const ASSETS = [
    "./",
    "./index.html",
    "./offline.html",
    "./styles.css"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        fetch(event.request).catch(() => caches.match("./offline.html"))
    );
});
