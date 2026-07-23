/* =========================================================
   ¿Salimos? — Service Worker (panel admin /citas)
   Scope: /citas/  (más específico que el SW raíz, así este controla el panel).
   Misma estrategia que el de la app: navegaciones network-first, recursos
   propios cache-first, y todo lo externo (Supabase) va directo a la red.
   ========================================================= */

const CACHE = 'salimos-admin-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  '../css/admin.css',
  '../js/config.js',
  '../js/db.js',
  '../js/icons.js',
  '../js/admin.js',
  '../icons/icon-192.png',
  '../icons/icon-512.png',
  '../icons/icon-180.png',
  '../icons/favicon-32.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(ASSETS.map((u) => cache.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return (await caches.match(req)) || (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) {
      fetch(req).then((res) => { if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone())); }).catch(() => {});
      return cached;
    }
    try {
      const res = await fetch(req);
      if (res && res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
      return res;
    } catch {
      return Response.error();
    }
  })());
});
