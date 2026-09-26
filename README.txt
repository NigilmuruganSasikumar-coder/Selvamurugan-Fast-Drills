SELVAMURUGAN FAST DRILLS — PWA PACKAGE
========================================

WHAT'S IN HERE
--------------
manifest.json     -> App metadata (name, colors, icons, shortcuts). Goes in
                     your site ROOT (same folder as index.html).
sw.js             -> Service worker. Goes in your site ROOT.
js/pwa.js         -> Registers the service worker + drives the install
                     banner / offline toast. Replace your old js/pwa.js.
index.html        -> Your original file with 3 tiny <head> tweaks:
                       - apple-touch-icon now points to img/apple-touch-icon.png
                       - favicon now points to img/favicon.ico
                       - added <meta name="apple-mobile-web-app-title">
                     Nothing else was changed. If you've edited index.html
                     since sending it to me, just make those 3 edits by hand
                     instead of overwriting your file with this one.
img/*.png, img/favicon.ico
                  -> Every icon size a PWA needs, generated from the
                     icon-512.png you provided (including "maskable"
                     versions Android uses for adaptive icons).

WHY YOUR OLD PWA GOT STUCK / DIDN'T UPDATE
-------------------------------------------
The classic cause is a service worker that:
  1. Caches the HTML "cache-first" forever, so old pages never leave cache.
  2. Never calls skipWaiting()/clients.claim(), so a NEW worker sits
     "waiting" until every open tab is closed — which normal visitors
     never do.

This sw.js fixes both:
  - HTML pages use NETWORK-FIRST (always fetch fresh when online; only
    fall back to cache when offline).
  - CSS/JS/images use STALE-WHILE-REVALIDATE (instant load from cache,
    silently refreshed in the background for next visit).
  - skipWaiting() + clients.claim() + a one-time auto-reload when a new
    worker takes over, so visitors actually see the new version.

HOW TO PUSH A NEW UPDATE IN THE FUTURE
----------------------------------------
Open sw.js and bump this line:
    const CACHE_VERSION = "v1.0.0";
to "v1.0.1" (or anything different) on every deploy where you want old
caches cleared out. This is the ONE line to change on future updates.

WHAT'S ALREADY WIRED IN YOUR SITE (no action needed)
-------------------------------------------------------
Your index.html already had:
  - A mobile-menu "Install Mobile App" card (#mnavInstallApp)
  - An install banner (#pwaInstallBanner / #pwaInstallBtn / #pwaInstallDismiss)
  - An offline toast (#pwaOfflineToast)
  - A bottom mobile nav bar
  - CSS already styled for all of the above (index1.css / index2.css)
  - script1.js already wires the mobile-menu button to click the banner's
    install button

js/pwa.js (this package) is what actually powers all of that:
  - Registers the service worker
  - Listens for the browser's install prompt and shows the banner
    AUTOMATICALLY 10 SECONDS after page load (only if not already
    installed and not dismissed in the last 7 days)
  - Wires the Install / Dismiss buttons
  - Toggles the offline toast based on connectivity

DEPLOY CHECKLIST
------------------
[ ] Upload manifest.json and sw.js to your site ROOT
[ ] Replace js/pwa.js with the one in this package
[ ] Upload all files from img/ into your site's img/ folder
[ ] Apply the 3 <head> tweaks to index.html (or use the one included here)
[ ] Open the live site in an incognito window, wait ~10s -> you should
    see the install banner appear
[ ] Check DevTools > Application > Service Workers to confirm it shows
    "activated and is running" with no old worker "waiting"

NOTE ON TESTING LOCALLY
--------------------------
Service workers require HTTPS (or localhost). If you preview via a plain
file:// path it will not register — that's expected, not a bug.
