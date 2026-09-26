/* ==========================================================================
   Selvamurugan Fast Drills — Service Worker
   ----------------------------------------------------------------------
   Fixes the "changes don't show up" problem by:
   1. Versioning every cache (CACHE_VERSION) — bump this string on each
      deploy that you want users to immediately pick up.
   2. self.skipWaiting() on install + clients.claim() on activate, so a
      new worker takes control right away instead of waiting for every
      open tab to be closed.
   3. NETWORK-FIRST for page navigations (HTML) — visitors always get the
      latest page when online, and only fall back to the cached copy when
      offline. This is the #1 cause of "site looks stuck on old version".
   4. STALE-WHILE-REVALIDATE for CSS/JS/images — instant loads from cache,
      while a background fetch quietly refreshes the cache for next time.
   ========================================================================== */

const CACHE_VERSION   = "v1.0.0";           // <-- bump this on every deploy
const STATIC_CACHE    = `smfd-static-${CACHE_VERSION}`;
const PAGES_CACHE     = `smfd-pages-${CACHE_VERSION}`;
const CURRENT_CACHES  = [STATIC_CACHE, PAGES_CACHE];

/* Minimal app-shell precache. Keep this short — everything else is
   cached opportunistically as it's requested, so you don't need to keep
   this list in sync with every asset on the site. */
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/quotation.html",
  "/manifest.json",
  "/css/index1.css",
  "/css/index2.css",
  "/js/script.js",
  "/js/script1.js",
  "/js/ui.js",
  "/img/icon-192.png",
  "/img/icon-512.png"
];

/* Never let the SW intercept these — always go straight to the network. */
function isNeverCache(url) {
  return (
    url.pathname.includes("/login") ||          // admin OTP flow
    url.hostname.includes("firestore") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("firebaseio") ||
    url.hostname.includes("emailjs")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch((err) => console.warn("[SW] precache failed (non-fatal):", err))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => !CURRENT_CACHES.includes(name))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* Let the page force an update without waiting for a reload cycle. */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;               // never touch POST/PUT etc.
  if (isNeverCache(url)) return;                       // let it hit the network directly
  if (url.origin !== self.location.origin) {
    // Allow the CDN fonts/icons through untouched (browser HTTP cache handles them)
    return;
  }

  const isNavigation =
    request.mode === "navigate" ||
    (request.method === "GET" && request.headers.get("accept")?.includes("text/html"));

  if (isNavigation) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const fresh = await fetch(request);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    return cached || cache.match("/index.html");
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkFetch;
}
