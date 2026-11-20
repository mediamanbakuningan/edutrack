/* Service Worker - EduTrack
 * Strategi:
 *  - Halaman (navigasi): network-first, jatuh ke cache bila offline
 *  - Aset statis (same-origin, cdnjs, Google Fonts): stale-while-revalidate
 *  - Panggilan API ke Apps Script & semua non-GET: TIDAK disentuh (selalu langsung ke jaringan)
 * Naikkan VERSION setiap kali file shell berubah agar cache lama dibuang.
 */
const VERSION = 'v1';
const SHELL = `edutrack-shell-${VERSION}`;
const RUNTIME = `edutrack-runtime-${VERSION}`;

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

const CDN_HOSTS = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') return;

  // Halaman utama: network-first
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  // Aset statis: stale-while-revalidate
  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin || CDN_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.open(RUNTIME).then((cache) =>
        cache.match(req).then((cached) => {
          const net = fetch(req)
            .then((res) => {
              if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
              return res;
            })
            .catch(() => cached);
          return cached || net;
        })
      )
    );
  }
  // selain itu (mis. script.google.com): biarkan browser menangani
});
