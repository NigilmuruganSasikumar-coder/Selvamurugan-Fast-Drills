/* Bottom-nav loader: width follows how far the page has been scrolled. */
(function () {
  'use strict';
  var nav = document.querySelector('.pwa-bottom-nav');
  if (!nav) return;

  var ticking = false;

  function update() {
    var doc = document.documentElement;
    var max = (doc.scrollHeight || 0) - window.innerHeight;
    var p = max > 0 ? (window.pageYOffset || doc.scrollTop || 0) / max : 0;
    nav.style.setProperty('--pwa-progress', Math.min(1, Math.max(0, p)).toFixed(4));
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', update);
  update();
})();
