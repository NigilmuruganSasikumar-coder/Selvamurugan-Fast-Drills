/* ==========================================================================
   Selvamurugan Fast Drills — PWA registration & install UX
   --------------------------------------------------------------------------
   Wires up:
     - Service worker registration (with update handling)
     - #pwaInstallBanner / #pwaInstallBtn / #pwaInstallDismiss
       (auto-shown 10s after page load, and reused by the mobile menu's
       "Install Mobile App" card via script1.js -> #pwaInstallBtn.click())
     - #pwaOfflineToast online/offline indicator
   ========================================================================== */
(function () {
  "use strict";

  const AUTO_PROMPT_DELAY_MS = 10000;           // show banner 10s after load
  const DISMISS_SNOOZE_DAYS  = 7;                // don't re-nag for a week
  const STORAGE_DISMISSED_AT = "smfd-pwa-install-dismissed-at";
  const STORAGE_INSTALLED    = "smfd-pwa-installed";

  let deferredPrompt = null;

  /* ---------------------------- SERVICE WORKER --------------------------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // If a new SW is already waiting (e.g. user had the site open
          // when a new version was deployed), activate it immediately.
          if (reg.waiting) {
            reg.waiting.postMessage("SKIP_WAITING");
          }
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // A new version has been fetched and is ready — activate it.
                newWorker.postMessage("SKIP_WAITING");
              }
            });
          });
        })
        .catch((err) => console.warn("[PWA] Service worker registration failed:", err));

      // When the new SW takes control, do a one-time reload so the visitor
      // is actually running the new version (avoids "half old, half new" UI).
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    });
  }

  /* ---------------------------- INSTALL BANNER ---------------------------- */
  const banner      = document.getElementById("pwaInstallBanner");
  const installBtn  = document.getElementById("pwaInstallBtn");
  const dismissBtn  = document.getElementById("pwaInstallDismiss");

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  function wasRecentlyDismissed() {
    const raw = localStorage.getItem(STORAGE_DISMISSED_AT);
    if (!raw) return false;
    const elapsedDays = (Date.now() - parseInt(raw, 10)) / (1000 * 60 * 60 * 24);
    return elapsedDays < DISMISS_SNOOZE_DAYS;
  }

  function showBanner() {
    if (!banner) return;
    if (isStandalone()) return;
    if (localStorage.getItem(STORAGE_INSTALLED) === "true") return;
    if (wasRecentlyDismissed()) return;
    if (!deferredPrompt) return; // browser hasn't offered install yet
    banner.classList.add("pwa-install-banner--visible");
  }

  function hideBanner() {
    if (banner) banner.classList.remove("pwa-install-banner--visible");
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    // Auto-surface the banner after the requested delay, once per visit.
    window.setTimeout(showBanner, AUTO_PROMPT_DELAY_MS);
  });

  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      hideBanner();
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        localStorage.setItem(STORAGE_INSTALLED, "true");
      }
      deferredPrompt = null;
    });
  }

  if (dismissBtn) {
    dismissBtn.addEventListener("click", () => {
      hideBanner();
      localStorage.setItem(STORAGE_DISMISSED_AT, String(Date.now()));
    });
  }

  window.addEventListener("appinstalled", () => {
    localStorage.setItem(STORAGE_INSTALLED, "true");
    hideBanner();
    deferredPrompt = null;
  });

  /* ---------------------------- OFFLINE TOAST ---------------------------- */
  const offlineToast = document.getElementById("pwaOfflineToast");

  function updateOnlineStatus() {
    if (!offlineToast) return;
    offlineToast.classList.toggle("pwa-offline-toast--visible", !navigator.onLine);
  }

  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
  document.addEventListener("DOMContentLoaded", updateOnlineStatus);
})();
