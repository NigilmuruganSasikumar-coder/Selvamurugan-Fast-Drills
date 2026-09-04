/* ==========================================================================
   SELVAMURUGAN FAST DRILLS — SERVICE WORKER
   Cache-first for assets, network-first for HTML pages.
   ========================================================================== */

var CACHE_NAME = 'smfd-v1';

/* Files to pre-cache on install */
var PRECACHE = [
  '/',
  '/index.html',
  '/index2.css',
  '/script1.js',
  '/pwa.js',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

/* ── INSTALL ──────────────────────────────────────────────────────────── */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE);
    })
  );
  self.skipWaiting();
});

/* ── ACTIVATE — purge old caches ─────────────────────────────────────── */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

/* ── FETCH — network-first for HTML, cache-first for everything else ── */
self.addEventListener('fetch', function (event) {
  var req = event.request;

  /* Only intercept GET requests */
  if (req.method !== 'GET') return;

  /* Network-first for navigation (HTML pages) */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(req, copy); });
          return res;
        })
        .catch(function () {
          return caches.match('/index.html');
        })
    );
    return;
  }

  /* Cache-first for assets (CSS, JS, fonts, images) */
  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function (c) { c.put(req, copy); });
        return res;
      });
    })
  );
});
