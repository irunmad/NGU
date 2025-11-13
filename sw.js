// Offline cache with CSV (stale-while-revalidate для данных)
const CACHE = 'gen-app-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './Icons/icon-192.png',
  './Icons/icon-512.png',
  './data/thresholds_men.csv',
  './data/thresholds_women.csv',
  './data/scales_men.csv',
  './data/scales_women.csv',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') {
      e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
      return;
    }
    // CSV и иконки: stale-while-revalidate
    if (req.url.includes('/data/') || req.url.includes('/Icons/')) {
      e.respondWith(
        caches.open(CACHE).then(async (cache) => {
          const cached = await cache.match(req);
          const fetchPromise = fetch(req).then((res) => { cache.put(req, res.clone()); return res; }).catch(()=>cached);
          return cached || fetchPromise;
        })
      );
      return;
    }
    // остальное: cache-first
    e.respondWith(
      caches.match(req).then((hit) =>
        hit || fetch(req).then((res) => { caches.open(CACHE).then((c)=>c.put(req,res.clone())); return res; })
      )
    );
  }
});
