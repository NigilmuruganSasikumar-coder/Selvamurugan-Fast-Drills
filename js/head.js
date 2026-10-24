/* HEAD SCRIPTS - theme applied before first paint, robot image fallback */

/* ================= theme-init.js ================= */
/* Runs in <head> BEFORE first paint so the saved/system theme is applied with no flash.
   Keep this as a normal (non-defer) script. */
(function () {
        var stored = localStorage.getItem("smfd-theme");
        var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.setAttribute("data-theme", stored || (prefersDark ? "dark" : "light"));
    })();
;

/* ================= ai-img-fallback.js ================= */
/* AI robot images (img/robot-avatar.jpg, img/robot-header.jpg): if one is missing, show the robot icon instead */
function aiImgNext(img){
  img.onerror = null;
  var ic = document.createElement('i'); ic.className = 'fas fa-robot'; img.replaceWith(ic);
}
;
