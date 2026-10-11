/* theme-switcher.js — one-click Dark/Light button.
   Same storage key and data-theme attribute as theme-init.js / script1.js. */
(function () {
  "use strict";
  var KEY = "smfd-theme";
  var root = document.documentElement;
  var btn = document.getElementById("themeSwitchBtn");
  if (!btn) return;

  function current() { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }

  function sync() {
    var c = current();
    btn.setAttribute("aria-pressed", c === "light" ? "true" : "false");
    btn.setAttribute("aria-label", "Switch to " + (c === "dark" ? "light" : "dark") + " mode");
    btn.title = "Switch to " + (c === "dark" ? "light" : "dark") + " mode";
  }

  btn.addEventListener("click", function () {
    var next = current() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem(KEY, next); } catch (e) {}
    sync();
  });

  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  sync();
})();