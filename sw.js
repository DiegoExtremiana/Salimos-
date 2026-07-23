/* =========================================================
   ¿Salimos? — Service Worker (app / invitación)
   Objetivo: que la app sea INSTALABLE y se abra a pantalla completa
   (sin barra del navegador una vez añadida a la pantalla de inicio).
   Estrategia:
   - Navegaciones (HTML): network-first, con la copia en caché como respaldo
     (offline). Así el contenido siempre está fresco cuando hay red.
   - Recursos propios (css/js/iconos): cache-first, y se refresca en segundo plano.
   - Todo lo de otros dominios (Supabase, Leaflet, tiles, Overpass, Nominatim):
     NO se intercepta -> va directo a la red.
   ========================================================= */

const CACHE = 'salimos-app-v1';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/config.js',
  './js/db.js',
  './js/icons.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // addAll falla entero si un recurso da 404; añadimos uno a uno para ser tolerantes.
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
  if (url.origin !== self.location.origin) return;   // otros dominios -> red directa

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
      // refresca en segundo plano
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
