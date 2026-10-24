/* REMAINING SITE FUNCTIONS - loader, menu, theme, scroll effects, search, About 3D tilt */

/* ================= script1.js ================= */
/* ==========================================================================
   SELVAMURUGAN FAST DRILLS — interactions
   Theme toggle · mobile menu · navbar shrink · scroll reveals ·
   stat counters · signature depth-gauge · button ripple · smooth anchors
   ========================================================================== */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------- THEME TOGGLE ---------------------------- */
  const themeBtn = document.getElementById("themeToggle");
  const root = document.documentElement;

  function setTheme(mode) {
    root.setAttribute("data-theme", mode);
    try { localStorage.setItem("smfd-theme", mode); } catch (e) {}
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") === "light" ? "light" : "dark";
      setTheme(current === "light" ? "dark" : "light");
    });
  }

  /* ---------------------------- MOBILE MENU ------------------------------
     Guarded so it works whether or not the inline HTML script also binds it. */
  const menuBtn = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");
  const overlay = document.getElementById("navOverlay");

  function openMenu() {
    navLinks && navLinks.classList.add("active");
    menuBtn && menuBtn.classList.add("active");
    overlay && overlay.classList.add("active");
    menuBtn && menuBtn.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
  }
  function closeMenu() {
    navLinks && navLinks.classList.remove("active");
    menuBtn && menuBtn.classList.remove("active");
    overlay && overlay.classList.remove("active");
    menuBtn && menuBtn.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  }
  if (menuBtn && !menuBtn.dataset.bound) {
    menuBtn.dataset.bound = "true";
    menuBtn.addEventListener("click", () => {
      navLinks && navLinks.classList.contains("active") ? closeMenu() : openMenu();
    });
    overlay && overlay.addEventListener("click", closeMenu);
    navLinks && navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
  }

  /* ---------------------------- MOBILE DRAWER EXTRAS --------------------- */
  const mnavCloseBtn = document.getElementById("mnavClose");
  if (mnavCloseBtn) {
    mnavCloseBtn.addEventListener("click", closeMenu);
  }

  /* "Install Mobile App" card — reuses the same install prompt wired up
     for the PWA install banner button (#pwaInstallBtn) in js/pwa.js.
     Falls back to no-op (just closes the menu) if that flow isn't ready. */
  const mnavInstallApp = document.getElementById("mnavInstallApp");
  if (mnavInstallApp) {
    mnavInstallApp.addEventListener("click", (e) => {
      e.preventDefault();
      const pwaBtn = document.getElementById("pwaInstallBtn");
      if (pwaBtn) pwaBtn.click();
    });
  }

  /* ---------------------------- NAVBAR SHRINK ---------------------------- */
  const navbar = document.querySelector(".navbar");
  if (navbar) {
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          navbar.classList.toggle("scrolled", window.scrollY > 40);
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  /* ---------------------------- SMOOTH ANCHOR SCROLL ---------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        }
      }
    });
  });

  /* ---------------------------- GALLERY: WRAP FOR CAPTION OVERLAY ------------
     Turns each <img> in .gaimg into a .gaimg-item wrapper with a caption pulled
     from its alt text, so the hover overlay/caption in the CSS has somewhere to sit. */
  document.querySelectorAll(".gaimg img").forEach((img) => {
    if (img.closest(".gaimg-item")) return;
    const wrap = document.createElement("div");
    wrap.className = "gaimg-item";
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);
    if (img.alt) {
      const cap = document.createElement("span");
      cap.className = "cap";
      cap.textContent = img.alt;
      wrap.appendChild(cap);
    }
  });

  /* ---------------------------- SCROLL REVEAL ------------------------------ */
  const revealTargets = document.querySelectorAll(
    ".aboutbox, .services, .testimonial-card, .gaimg-item, .service-card, .contcolor button, " +
      "#about, #services1, .calculator-title, .section-title, #faq .section-title, .baccor2 #contact"
  );
  if ("IntersectionObserver" in window && revealTargets.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealTargets.forEach((el, i) => {
      el.style.transitionDelay = reduceMotion ? "0ms" : Math.min(i % 6, 5) * 70 + "ms";
      io.observe(el);
    });
  } else {
    revealTargets.forEach((el) => el.classList.add("in-view"));
  }

  /* ---------------------------- STAT COUNTERS ------------------------------ */
  const statEls = document.querySelectorAll(".stat h3[data-target]");
  function animateCount(el) {
    const target = parseInt(el.getAttribute("data-target"), 10) || 0;
    const suffix = el.getAttribute("data-suffix") || "";
    if (reduceMotion) {
      el.textContent = target + suffix;
      return;
    }
    const duration = 1400;
    const start = performance.now();
    function step(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window && statEls.length) {
    const statIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            statIO.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    statEls.forEach((el) => statIO.observe(el));
  } else {
    statEls.forEach(animateCount);
  }

  /* ---------------------------- CURSOR-FOLLOW GLOW --------------------------- */
  if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".aboutbox, .services, .contcolor button").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", e.clientX - rect.left + "px");
        card.style.setProperty("--my", e.clientY - rect.top + "px");
      });
    });
  }

  /* ---------------------------- BUTTON RIPPLE ------------------------------- */
  document.querySelectorAll(".primary-btn, .secondary-btn, .call-btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      if (reduceMotion) return;
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement("span");
      const size = Math.max(rect.width, rect.height);
      ripple.className = "ripple";
      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = e.clientX - rect.left - size / 2 + "px";
      ripple.style.top = e.clientY - rect.top - size / 2 + "px";
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    });
  });

  /* ---------------------------- SIGNATURE: DEPTH GAUGE ------------------------
     Injects a strata cross-section with a descending drill bit + live depth
     readout into the hero, on both edges, without touching the HTML markup. */
  function buildStrataSVG() {
    const bands = [
      { c: "#8B6A3E", h: 12 }, { c: "#6E5330", h: 10 }, { c: "#4E4A3A", h: 14 },
      { c: "#3A5A52", h: 10 }, { c: "#2E4A55", h: 16 }, { c: "#1F313C", h: 12 },
      { c: "#16232C", h: 14 }, { c: "#0F1B22", h: 12 },
    ];
    let y = 0;
    let rects = "";
    bands.forEach((b) => {
      rects += `<rect x="0" y="${y}%" width="100%" height="${b.h}%" fill="${b.c}" opacity="0.55"></rect>`;
      y += b.h;
    });
    return `<svg class="strata-band" width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">${rects}</svg>`;
  }

  function injectDepthGauge() {
    const hero = document.querySelector(".hero");
    if (!hero || hero.querySelector(".depth-gauge")) return;
    hero.style.position = "relative";

    ["left", "right"].forEach((side) => {
      const gauge = document.createElement("div");
      gauge.className = "depth-gauge " + side;
      gauge.setAttribute("aria-hidden", "true");
      gauge.innerHTML =
        buildStrataSVG() +
        '<div class="bit"></div>' +
        '<div class="depth-readout" data-depth>0 FT</div>';
      hero.appendChild(gauge);
    });

    if (reduceMotion) return;

    const readouts = hero.querySelectorAll("[data-depth]");
    let depth = 0;
    const max = 1800;
    setInterval(() => {
      depth = (depth + 37) % max;
      readouts.forEach((r) => (r.textContent = depth + " FT"));
    }, 160);
  }
  injectDepthGauge();

  /* ---------------------------- DISTRICT LIST A11y ------------------------------
     Keep toggleDistrict() (defined inline in the HTML) working; just make sure
     any list without the inline handler still closes on outside click. */
  document.addEventListener("click", (e) => {
    const isServiceBtn = e.target.closest(".service-btn");
    if (isServiceBtn) return;
    if (!e.target.closest(".service-area1")) {
      document.querySelectorAll(".district-list.show").forEach((l) => l.classList.remove("show"));
    }
  });
})();

/* LOADER SEQUENCE — the cinematic intro that plays on first visit, or on repeat visits if CONFIG.skipOnRepeatVisit is false. */
  (function(){
    "use strict";

    /* ========================================================================
       CONFIG — every knob for retiming or restyling the sequence lives here.
       ======================================================================== */
    var CONFIG = {

      // Where the drilling actually happens, as a fraction of the rig
      // image's own box (0–1). Calibrated to the base of the rear
      // stabilizer leg, right under the mast.
      drillPoint: { x: 0.965, y: 0.955 },

      // Duration of each stage, in milliseconds. Edit freely — the code
      // that reads these doesn't care what the numbers are.
      stageDurations: {
        prepare:   1000,
        drilling:  1400,
        dust:      1700,
        found:     1100,
        spreading: 1550,
        flood:     950
      },
      revealDurationMs: 1100, // matches the CSS transition on #loader[data-stage="reveal"]

      // Hard safety net: no matter what happens (slow device, a JS error,
      // fonts stalling), the site is guaranteed to appear by this time.
      maxTotalFallbackMs: 11000,

      // Status copy per stage. Keep it short — this is a status line, not
      // a headline.
      statusText: {
        prepare:   "Preparing to drill…",
        drilling:  "Drilling deeper…",
        dust:      "Drilling deeper…",
        found:     "Water Found 💧",
        spreading: "Water rising to the surface…",
        flood:     "Almost there…"
      },

      dust:     { spawnEveryMs: 150, minSize: 22, maxSize: 46, minDur: 1500, maxDur: 2200 },
      droplets: { count: 6, staggerMs: 90 },
      bubbles:  { spawnEveryMs: 220, minSize: 6, maxSize: 16, minDur: 2600, maxDur: 4200 },

      // If true, visitors who already sat through the full intro this
      // browser session get a short 700ms crossfade instead of the full
      // cinematic sequence on subsequent page loads. Set to false to
      // always play the full sequence.
      skipOnRepeatVisit: true,
      sessionStorageKey: "smfd_intro_seen"
    };

    var reduceMotion = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var loader        = document.getElementById("loader");
    var rigScene      = document.getElementById("rigScene");
    var effectsAnchor = document.getElementById("effectsAnchor");
    var dustField     = document.getElementById("dustField");
    var dropletField  = document.getElementById("dropletField");
    var bubbleField    = document.getElementById("bubbleField");
    var statusText     = document.getElementById("statusText");
    var progressFill    = document.getElementById("progressFill");
    var waterFlood      = document.querySelector(".water-flood");

    var startTime = performance.now();
    var siteLoaded = document.readyState === "complete";
    window.addEventListener("load", function(){ siteLoaded = true; });

    var dustTimer = null;
    var bubbleTimer = null;
    var revealed = false;

    /* ------------------------------------------------------------------
       Position the effects anchor + water flood origin on the actual
       drilling point, in real viewport pixels, so the flood always
       expands from exactly the right spot regardless of screen size.
       ------------------------------------------------------------------ */
    function positionDrillPoint(){
      var rect = rigScene.getBoundingClientRect();
      var px = rect.left + rect.width  * CONFIG.drillPoint.x;
      var py = rect.top  + rect.height * CONFIG.drillPoint.y;

      effectsAnchor.style.left = (CONFIG.drillPoint.x * 100) + "%";
      effectsAnchor.style.top  = (CONFIG.drillPoint.y * 100) + "%";

      loader.style.setProperty("--drill-x", px + "px");
      loader.style.setProperty("--drill-y", py + "px");
    }

    var resizeRaf = null;
    window.addEventListener("resize", function(){
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(positionDrillPoint);
    });

    /* ------------------------------------------------------------------
       Stage 3 — dust particles rising from the drilling point
       ------------------------------------------------------------------ */
    function spawnDustParticle(){
      var el = document.createElement("span");
      el.className = "dust-particle";
      var size = rand(CONFIG.dust.minSize, CONFIG.dust.maxSize);
      var dur  = rand(CONFIG.dust.minDur, CONFIG.dust.maxDur);
      var dx   = rand(-46, 46);
      el.style.setProperty("--size", size + "px");
      el.style.setProperty("--dur", dur + "ms");
      el.style.setProperty("--dx", dx + "px");
      el.style.left = rand(-14, 14) + "px";
      el.addEventListener("animationend", function(){ el.remove(); });
      dustField.appendChild(el);
    }

    function startDust(){
      if (reduceMotion) return;
      spawnDustParticle();
      dustTimer = setInterval(spawnDustParticle, CONFIG.dust.spawnEveryMs);
    }
    function stopDust(){
      if (dustTimer) clearInterval(dustTimer);
      dustTimer = null;
    }

    /* ------------------------------------------------------------------
       Stage 4 — water droplets popping at the drilling point
       ------------------------------------------------------------------ */
    function spawnDroplets(){
      if (reduceMotion) return;
      for (var i = 0; i < CONFIG.droplets.count; i++){
        (function(i){
          setTimeout(function(){
            var el = document.createElement("span");
            el.className = "droplet";
            el.style.setProperty("--dx", rand(-20, 20) + "px");
            el.style.setProperty("--delay", "0s");
            el.addEventListener("animationend", function(){ el.remove(); });
            dropletField.appendChild(el);
          }, i * CONFIG.droplets.staggerMs);
        })(i);
      }
    }

    /* ------------------------------------------------------------------
       Stages 5 & 6 — bubbles rising through the flood water
       ------------------------------------------------------------------ */
    function spawnBubble(){
      var el = document.createElement("span");
      el.className = "bubble";
      var size = rand(CONFIG.bubbles.minSize, CONFIG.bubbles.maxSize);
      el.style.setProperty("--size", size + "px");
      el.style.setProperty("--dur", rand(CONFIG.bubbles.minDur, CONFIG.bubbles.maxDur) + "ms");
      el.style.setProperty("--sway", rand(-26, 26) + "px");
      el.style.setProperty("--x", rand(2, 98) + "%");
      el.addEventListener("animationend", function(){ el.remove(); });
      bubbleField.appendChild(el);
    }
    function startBubbles(){
      if (reduceMotion) return;
      spawnBubble();
      bubbleTimer = setInterval(spawnBubble, CONFIG.bubbles.spawnEveryMs);
    }
    function stopBubbles(){
      if (bubbleTimer) clearInterval(bubbleTimer);
      bubbleTimer = null;
    }

    function rand(min, max){ return Math.random() * (max - min) + min; }

    /* ------------------------------------------------------------------
       Progress line — width tracks elapsed time against the total
       choreographed duration, independent of exact stage boundaries so
       editing CONFIG.stageDurations never needs a second edit here.
       ------------------------------------------------------------------ */
    var totalChoreographedMs = 0;
    Object.keys(CONFIG.stageDurations).forEach(function(k){
      totalChoreographedMs += CONFIG.stageDurations[k];
    });

    var progressRaf = null;
    function tickProgress(){
      var elapsed = performance.now() - startTime;
      var pct = Math.min(100, (elapsed / totalChoreographedMs) * 100);
      progressFill.style.width = pct + "%";
      if (pct < 100 && !revealed){
        progressRaf = requestAnimationFrame(tickProgress);
      }
    }

    /* ------------------------------------------------------------------
       Stage machine — each stage sets data-stage, updates the status
       line, and (de)activates the effects that belong to it. Ordered
       exactly as the brief's seven scenes.
       ------------------------------------------------------------------ */
    function setStage(name){
      loader.setAttribute("data-stage", name);
      if (CONFIG.statusText[name]) statusText.textContent = CONFIG.statusText[name];
    }

    function runFullSequence(){
      positionDrillPoint();
      tickProgress();

      var t = 0;
      var d = CONFIG.stageDurations;

      // Scene 1 — initial loading (already showing: brand + rig fade in)
      setStage("prepare");

      // Scene 2 — rig starts drilling
      t += d.prepare;
      setTimeout(function(){
        setStage("drilling");
        loader.classList.add("is-vibrating");
      }, t);

      // Scene 3 — white drilling dust
      t += d.drilling;
      setTimeout(function(){
        setStage("dust");
        startDust();
      }, t);

      // Scene 4 — water is found
      t += d.dust;
      setTimeout(function(){
        stopDust();
        loader.classList.remove("is-vibrating");
        setStage("found");
        spawnDroplets();
      }, t);

      // Scene 5 — water spreads outward from the drilling point
      t += d.found;
      setTimeout(function(){
        setStage("spreading");
        var diag = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight);
        waterFlood.style.clipPath = "circle(" + (diag * 0.55) + "px at var(--drill-x) var(--drill-y))";
        startBubbles();
      }, t);

      // Scene 6 — full-screen water transition
      t += d.spreading;
      setTimeout(function(){
        setStage("flood");
        var diag = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight);
        waterFlood.style.clipPath = "circle(" + (diag * 1.05) + "px at var(--drill-x) var(--drill-y))";
      }, t);

      // Scene 7 — website reveal
      t += d.flood;
      setTimeout(attemptReveal, t);
    }

    function runReducedMotionSequence(){
      // Same story beats, told in one quiet breath: brand, a drilling
      // beat, water found, reveal. No particles, no vibration, no long
      // clip-path chase — just the text and a small local water cue.
      setStage("prepare");
      setTimeout(function(){ setStage("drilling"); }, 300);
      setTimeout(function(){ setStage("found"); }, 600);
      setTimeout(attemptReveal, 950);
    }

    /* ------------------------------------------------------------------
       Reveal — waits (briefly, and only up to the hard cap) for the real
       page to finish loading before it lets the water flow away.
       ------------------------------------------------------------------ */
    function attemptReveal(){
      if (revealed) return;
      var elapsed = performance.now() - startTime;
      if (siteLoaded || elapsed >= CONFIG.maxTotalFallbackMs){
        reveal();
      } else {
        var remaining = CONFIG.maxTotalFallbackMs - elapsed;
        setTimeout(reveal, Math.min(remaining, 1200));
      }
    }

    function reveal(){
      if (revealed) return;
      revealed = true;
      stopDust();
      stopBubbles();
      if (progressRaf) cancelAnimationFrame(progressRaf);
      progressFill.style.width = "100%";
      loader.classList.remove("is-vibrating");
      setStage("reveal");
      document.body.classList.remove("is-loading");

      try {
        if (CONFIG.skipOnRepeatVisit){
          sessionStorage.setItem(CONFIG.sessionStorageKey, "1");
        }
      } catch (e) { /* storage unavailable — fine, just always play the intro */ }

      setTimeout(function(){
        loader.classList.add("is-done");
      }, CONFIG.revealDurationMs + 50);
    }

    // Absolute fallback: whatever else happens, never leave someone stuck.
    setTimeout(function(){ attemptReveal(); }, CONFIG.maxTotalFallbackMs);

    /* ------------------------------------------------------------------
       Kick off
       ------------------------------------------------------------------ */
    var seenBefore = false;
    try {
      seenBefore = CONFIG.skipOnRepeatVisit &&
        sessionStorage.getItem(CONFIG.sessionStorageKey) === "1";
    } catch (e) { seenBefore = false; }

    if (reduceMotion){
      runReducedMotionSequence();
    } else if (seenBefore){
      // Quick, quiet welcome-back crossfade — full story only plays once
      // per browser session. Flip CONFIG.skipOnRepeatVisit to false to
      // always show the complete sequence.
      setStage("prepare");
      setTimeout(attemptReveal, 500);
    } else {
      runFullSequence();
    }

  })();

/* ==========================================================================
   DISTRICT LIST TOGGLE (moved from inline <script> in index.html)
   Must stay global — called via onclick in the HTML.
   ========================================================================== */
function toggleDistrict(id){
    const lists = document.querySelectorAll(".district-list");
    lists.forEach(list=>{ if(list.id !== id){ list.classList.remove("show"); } });
    document.getElementById(id).classList.toggle("show");
}

/* ==========================================================================
   ENQUIRY FORM -> WhatsApp (moved from inline <script> in index.html)
   ========================================================================== */
(function () {
    var toggleBtns = document.querySelectorAll('#efType .ef-toggle__btn');
    var selectedType = 'Residential';
    toggleBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            toggleBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            selectedType = btn.getAttribute('data-type');
        });
    });

    var submitBtn = document.getElementById('efSubmit');
    if (submitBtn) {
        submitBtn.addEventListener('click', function () {
            var name = document.getElementById('efName').value.trim();
            var phone = document.getElementById('efPhone').value.trim();
            var location = document.getElementById('efLocation').value.trim();
            var service = document.getElementById('efService').value;
            var msg = document.getElementById('efMsg').value.trim();

            if (!name || !phone || !location || !service) {
                alert('Please fill in all required fields (Name, Phone Number, Location / Village, Service Required).');
                return;
            }

            var lines = [
                'Hello Selvamurugan Fast Drills,', '',
                'Name: ' + name,
                'Phone: +91 ' + phone,
                'Location/Village: ' + location,
                'Service Required: ' + service,
                'Requirement Type: ' + selectedType
            ];
            if (msg) { lines.push('Message: ' + msg); }

            var text = encodeURIComponent(lines.join('\n'));
            window.open('https://wa.me/919488161788?text=' + text, '_blank');
        });
    }
})();

/* ==========================================================================
   FOOTER ACCORDION (moved from inline <script> in index.html)
   ========================================================================== */
/* Footer accordion — mobile only (≤ 768px) */
(function () {
  function initFooterAccordion() {
    var toggles = document.querySelectorAll('.footer-col-toggle');
    toggles.forEach(function (btn) {
      var body = document.getElementById(btn.getAttribute('aria-controls'));
      if (!body) return;
      if (window.innerWidth <= 768) btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function () {
        if (window.innerWidth > 768) return;
        btn.setAttribute('aria-expanded',
          btn.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
      });
    });
  }
  var t;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      if (window.innerWidth > 768)
        document.querySelectorAll('.footer-col-toggle')
          .forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    }, 150);
  });
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', initFooterAccordion)
    : initFooterAccordion();
})();
;

/* ================= theme-switcher.js ================= */
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
;

/* ================= search.js ================= */
/* search.js — lightweight on-site search (no libraries, no network, no AI).
   Indexes the page's real sections, service cards, service areas, FAQ and
   contact info straight from the DOM, plus the separate "ai chat.html" page.
   Every result is validated against the live page: if its target does not
   exist, it is never shown. */
(function () {
  "use strict";

  var doc = document, root = doc.documentElement;
  var trigger = doc.getElementById("siteSearchBtn");
  var panel = doc.getElementById("siteSearchPanel");
  if (!trigger || !panel) return;

  var backdrop = doc.getElementById("siteSearchBackdrop");
  var input = doc.getElementById("siteSearchInput");
  var clearBtn = doc.getElementById("siteSearchClear");
  var closeBtn = doc.getElementById("siteSearchClose");
  var headEl = doc.getElementById("siteSearchHead");
  var listEl = doc.getElementById("siteSearchList");
  var emptyEl = doc.getElementById("siteSearchEmpty");
  var statusEl = doc.getElementById("siteSearchStatus");
  var navbar = doc.querySelector(".navbar");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var isOpen = false, entries = null, shown = [], active = -1;

  /* ------------------------------------------------------------ text utils */
  var STOP = { a:1, an:1, the:1, in:1, of:1, for:1, to:1, and:1, or:1, my:1, me:1, is:1, are:1, do:1, you:1, your:1, i:1, how:1, what:1, where:1, can:1, at:1, on:1, with:1 };

  function stem(w) {
    if (w.length > 4 && w.slice(-3) === "ies") return w.slice(0, -3) + "y";
    if (w.length > 3 && w.slice(-1) === "s" && w.slice(-2) !== "ss") return w.slice(0, -1);
    return w;
  }
  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[’'`]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim()
      .split(" ").map(stem).join(" ");
  }
  function tokens(q) {
    var all = norm(q).split(" ").filter(Boolean);
    var kept = all.filter(function (t) { return !STOP[t]; });
    return kept.length ? kept : all;
  }
  function clean(t) { return String(t || "").replace(/\s+/g, " ").trim(); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function titleCase(s) { return clean(s).toLowerCase().replace(/(^|[\s-])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }); }
  function clip(s, n) { s = clean(s); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; }

  /* synonyms: any word in a group also matches the others (at lower weight) */
  var GROUPS = [
    ["price","pricing","cost","rate","charge","estimate","quote","quotation","budget","fee"],
    ["book","booking","enquiry","inquiry","appointment","schedule","order","hire","request"],
    ["contact","call","phone","mobile","number","whatsapp","email","mail","reach","helpline"],
    ["location","area","place","village","town","city","region","address","map","nearby","near"],
    ["flush","flushing","clean","cleaning","restore","restoration","silt","revive","rebore","deepening"],
    ["detect","detection","find","finding","locate","survey","sensor","divining","groundwater"],
    ["repair","maintenance","servicing","fix","pump"],
    ["borewell","bore","borehole","tubewell"],
    ["farm","farming","agriculture","agricultural","irrigation","field","plantation"],
    ["home","house","residential","domestic","villa","apartment"],
    ["factory","industrial","industry","commercial"],
    ["emergency","urgent","immediate","night","24x7"],
    ["review","rating","feedback","testimonial"],
    ["photo","image","picture","gallery","portfolio"],
    ["rig","machine","equipment","hydraulic"]
  ];
  var SYN = {};
  GROUPS.forEach(function (g) {
    var n = g.map(norm);
    n.forEach(function (w) { SYN[w] = (SYN[w] || []).concat(n.filter(function (x) { return x !== w; })); });
  });

  /* ------------------------------------------------------------ DOM helpers */
  function qs(sel) { try { return doc.querySelector(sel); } catch (e) { return null; } }
  function qsa(sel) { try { return Array.prototype.slice.call(doc.querySelectorAll(sel)); } catch (e) { return []; } }
  function rendered(el) { return !!el && el.getClientRects().length > 0; }
  function renderedOrAncestor(el) {
    while (el && el !== doc.body) { if (rendered(el)) return el; el = el.parentElement; }
    return null;
  }
  function byHeading(tag, text, exact) {
    var want = norm(text), list = qsa(tag);
    for (var i = 0; i < list.length; i++) {
      var got = norm(list[i].textContent);
      if (exact ? got === want : got.indexOf(want) > -1) return list[i];
    }
    return null;
  }
  var usedIds = {};
  function ensureId(el, title) {
    if (el.id) return el.id;
    var slug = String(title || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48).replace(/-+$/, "");
    var base = "sx-" + (slug || "item"), id = base, n = 2;
    while (doc.getElementById(id) || usedIds[id]) id = base + "-" + n++;
    usedIds[id] = 1; el.id = id; return id;
  }

  /* ------------------------------------------------------------ index build */
  function ICON(title, map) {
    var t = norm(title);
    for (var i = 0; i < map.length; i++) if (t.indexOf(map[i][0]) > -1) return map[i][1];
    return "fa-gear";
  }

  function curated() {
    var tel = qs('a[href^="tel:"]'), digits = tel ? (tel.getAttribute("href") || "").replace(/\D/g, "") : "";
    var phoneKw = digits ? (digits + " " + digits.replace(/^91/, "")) : "";
    return [
      { t:"Home", d:"Trusted borewell company since 1995 — fast drilling and water in less time.", kw:"home top start welcome hero trusted since 1995 call now chat whatsapp", i:"fa-house", tag:"Section", sel:["#home"] },
      { t:"Drilling Cost Calculator", d:"Get an instant estimate: choose new drilling or rebore, bore size, depth and pipe length.", kw:"cost price estimate quote rate charges how much calculate calculator budget drillcalc", b:"new drilling rebore slab rate pvc pipe gst customer details project details", i:"fa-calculator", tag:"Calculator", boost:6, sel:["#calculator-section"] },
      { t:"Drilling & Pipe Rates", d:"Per-foot drilling and PVC pipe rates by bore size. Tap the eye icon in the calculator to view them.", kw:"price prices rate rates per foot ft pvc pipe cost bore size", i:"fa-indian-rupee-sign", tag:"Calculator", sel:["#drillRatePanel"], fb:["#calculator-section"] },
      { t:"Price Settings", d:"Adjust rates, extra charges and slab rates used in your estimate.", kw:"rates additional charges slab bore bata transport other charges settings gst tax", i:"fa-sliders", tag:"Calculator", sel:["#priceSettingsContainer"], fb:["#calculator-section"] },
      { t:"Old Borewell Rebore Estimate", d:"Estimate rebore or deepening of an existing borewell — choose “Rebore Drilling” in the calculator.", kw:"old borewell flushing flush rebore deepening existing bore cleaning restoration", i:"fa-arrows-rotate", tag:"Calculator", sel:[".mode-panel","#reboreBtn"], fb:["#calculator-section"] },
      { t:"Book Drilling Service", d:"Send your name, phone, location and requirement — the team will get back to you.", kw:"book booking enquiry inquiry schedule appointment request order hire form message site visit", i:"fa-calendar-check", tag:"Enquiry", boost:4, sel:["#enquiryForm"], fb:["#contact"] },
      { t:"Contact Us", d:"Call, WhatsApp or email the team for a free borewell consultation.", kw:"contact phone call whatsapp email mobile number reach support helpline " + phoneKw, i:"fa-phone", tag:"Contact", boost:3, sel:["#contact"] },
      { t:"Our Location", d:"Based in Tiruchengode, Namakkal. View the map and the areas we serve.", kw:"location address office map directions tiruchengode thiruchengode namakkal where find visit", i:"fa-map-location-dot", tag:"Contact", h:["h3","Location",true], fb:["#contact"] },
      { t:"Service Areas", d:"Borewell drilling across Madurai and nearby locations — 6 areas actively covered.", kw:"service area location madurai cover coverage serve near nearby region district tamil nadu", i:"fa-location-dot", tag:"Section", boost:4, sel:["#service-areas"] },
      { t:"More Locations We Cover", d:"Pudur, Ayanur, Alagar Kovil, Anna Nagar, K.Pudur, Kalavasal, Villapuram, Madurai North & East and Madurai South & West.", kw:"outside areas pudur ayanur alagar kovil anna nagar kalavasal villapuram madurai north east south west locations", i:"fa-map-pin", tag:"Area", h:["h4","Outside These Areas?"], fb:["#service-areas"] },
      { t:"Borewell Drilling Services", d:"Deep, residential, agricultural, survey, repair and 24/7 emergency borewell services in Tamil Nadu & Maharashtra.", kw:"services service drilling borewell bore well deep residential agricultural farm irrigation industrial maharashtra", i:"fa-oil-well", tag:"Services", boost:4, sel:["#services1"], fb:["#ourservices1"] },
      { t:"How We Get You Water", d:"Our four steps: site check, water scan, precision drill and water found.", kw:"process steps how it works site check water scan precision drill", i:"fa-list-check", tag:"Section", h:["h2","How We Get You Water"] },
      { t:"Our Service Types", d:"Agricultural, domestic and industrial borewell drilling.", kw:"types agricultural domestic industrial farm irrigation home factory", i:"fa-layer-group", tag:"Section", h:["h3","Our Service Types"] },
      { t:"Auto Sensor Technology", d:"Advanced sensor technology for accurate water detection and better results.", kw:"sensor technology water detection auto accurate", i:"fa-satellite-dish", tag:"Technology", h:["h3","Auto Sensor Technology"] },
      { t:"5000+ Happy Customers", d:"30+ years of experience, 2000 ft deep drilling and 24×7 emergency service.", kw:"customers years experience depth 2000 feet 24x7 stats emergency 5000 happy", i:"fa-chart-simple", tag:"Section", h:["h3","5000+"] },
      { t:"Why Choose Selvamurugan Fast Drills", d:"Fast drilling, accurate water detection, modern equipment, 30+ years of experience and 24/7 support.", kw:"why choose about us company experience trust since 1995 reliable", i:"fa-circle-info", tag:"About", sel:["#about"] },
      { t:"Fast Drilling Service", d:"Projects completed quickly without compromising quality. Same-day service for urgent requirements.", kw:"fast quick same day urgent speed time", i:"fa-bolt", tag:"About", h:["h2","Fast Drilling Service"] },
      { t:"Accurate Water Detection", d:"Advanced sensor technology for precise water point identification, with a higher success rate and minimal risk.", kw:"water detection water finding find water point sensor survey accurate groundwater", i:"fa-droplet", tag:"About", h:["h2","Accurate Water Detection"] },
      { t:"Modern Equipment", d:"Advanced hydraulic machines for efficient, safe drilling in all soil and rock conditions.", kw:"machine rig hydraulic equipment soil rock", i:"fa-gears", tag:"About", h:["h2","Modern Equipment"] },
      { t:"30+ Years Experience", d:"Trusted borewell experts with decades of hands-on experience and thousands of successful projects.", kw:"experience years since 1995 trusted expert", i:"fa-award", tag:"About", h:["h2","30+ Years Experience"] },
      { t:"24/7 Support", d:"Our team is available round the clock for drilling and emergency needs.", kw:"support emergency night 24x7 24 hours help quick response", i:"fa-headset", tag:"About", h:["h2","24/7 Support"] },
      { t:"Project Portfolio", d:"Photos of our borewell drilling projects and equipment in action.", kw:"gallery photos images pictures portfolio projects work rig instagram", i:"fa-images", tag:"Gallery", sel:["#galary"] },
      { t:"Customer Reviews", d:"What customers say about our service — rated 4.9/5 on Google Reviews.", kw:"reviews ratings testimonials feedback google stars customers", i:"fa-star", tag:"Reviews", sel:["#testimonials"] },
      { t:"Frequently Asked Questions", d:"Answers about drilling cost, equipment, project time and who we serve.", kw:"faq questions answers help", i:"fa-circle-question", tag:"FAQ", sel:["#faq"] },
      { t:"Borewell AI Chat", d:"Open the AI assistant page to ask questions about borewells, pricing and service areas.", kw:"ai chat assistant chatbot bot ask help questions", i:"fa-robot", tag:"Page", kind:"page", href:"ai chat.html" }
    ];
  }

  function harvest() {
    var out = [];
    var svcIcons = [["deep","fa-oil-well"],["residential","fa-house"],["agricultur","fa-seedling"],["consultation","fa-clipboard-list"],["survey","fa-clipboard-list"],["maintenance","fa-screwdriver-wrench"],["emergency","fa-clock"]];
    var svcKw = [
      ["maintenance","old borewell flushing flush cleaning restoration pump repair silt servicing"],
      ["consultation","water detection water finding water survey groundwater site survey soil test location"],
      ["deep","depth feet 1800 500 rock hard rock cleaning deepening 6.5 inch 4.75 inch new bore"],
      ["emergency","urgent 24x7 24/7 night immediate quick response"],
      ["agricultur","farm field irrigation plantation crops"],
      ["residential","home house villa apartment layout"]
    ];
    qsa("#ourservices .services").forEach(function (card) {
      var h = card.querySelector("h1"), d = card.querySelector("h3");
      if (!h) return;
      var title = clean(h.textContent), extra = "";
      svcKw.forEach(function (p) { if (norm(title).indexOf(p[0]) > -1) extra += " " + p[1]; });
      out.push({ t:title, d:clip(d ? d.textContent : "", 130), kw:"service services drilling borewell" + extra,
        b:Array.prototype.map.call(card.querySelectorAll("p"), function (p) { return p.textContent; }).join(" "),
        i:ICON(title, svcIcons), tag:"Service", el:card, fb:["#ourservices1","#services1"] });
    });
    qsa(".sarea-card").forEach(function (card) {
      var h = card.querySelector("h3"), p = card.querySelector("p");
      if (!h) return;
      var name = titleCase(h.textContent), alias = "";
      if (/tirupparankundram/i.test(name)) alias = "thiruparankundram thirupparankundram tiruparankundram";
      if (/solavandan/i.test(name)) alias = "sholavandan";
      out.push({ t:name, d:clean(p ? p.textContent : ""), kw:"service area location borewell drilling " + alias, i:"fa-location-dot", tag:"Area", el:card, fb:["#service-areas"] });
    });
    qsa("#faq details").forEach(function (det) {
      var s = det.querySelector("summary"), p = det.querySelector("p");
      if (!s) return;
      out.push({ t:clean(s.textContent), d:clip(p ? p.textContent : "", 130), kw:"faq question answer", b:p ? p.textContent : "", i:"fa-circle-question", tag:"FAQ", el:det, fb:["#faq"] });
    });
    qsa(".fsoc[href]").forEach(function (a) {
      var label = clean(a.getAttribute("aria-label"));
      if (!label || /^website$/i.test(label)) return;
      var ic = a.querySelector("i"), cls = ic ? ic.className.replace(/[^a-z0-9 -]/gi, "") : "fa-solid fa-link";
      out.push({ t:label, d:"Open our " + label + " page in a new tab.", kw:"social media follow videos " + label, icon:cls, tag:"Social", kind:"external", href:a.href });
    });
    return out;
  }

  function finalize(e) {
    e.kind = e.kind || "section";
    e.sel = e.sel || []; e.fb = e.fb || [];
    if (e.kind === "section") {
      if (!e.el && e.h) e.el = byHeading(e.h[0], e.h[1], e.h[2]);
      var primary = e.el || null, i;
      for (i = 0; !primary && i < e.sel.length; i++) primary = qs(e.sel[i]);
      for (i = 0; !primary && i < e.fb.length; i++) primary = qs(e.fb[i]);
      if (!primary) return null;                       /* target not on this page → no result */
      e.id = ensureId(primary, e.t);
      e.href = "#" + e.id;
    }
    e.icon = e.icon || ("fas " + e.i);
    e.n = { t:norm(e.t), k:norm(e.kw || ""), d:norm(e.d || ""), b:norm(e.b || "") };
    e.h2 = { t:" " + e.n.t + " ", k:" " + e.n.k + " ", d:" " + e.n.d + " ", b:" " + e.n.b + " " };
    return e;
  }

  var vocab = {};
  function build() {
    var list = curated().concat(harvest()).map(function (e) { try { return finalize(e); } catch (x) { return null; } }).filter(Boolean);
    list.forEach(function (e, idx) {
      e.order = idx;
      (e.n.t + " " + e.n.k + " " + e.n.d).split(" ").forEach(function (w) { if (w.length > 3) vocab[w] = 1; });
    });
    return list;
  }
  function ensure() { if (!entries) entries = build(); return entries; }

  /* ----------------------------------------------------------------- search */
  var W = { t:10, k:6, d:3, b:1.5 };
  function fscore(tok, f, hay, plain) {
    if (hay.indexOf(" " + tok + " ") > -1) return 1;
    if (hay.indexOf(" " + tok) > -1) return .8;
    if (tok.length >= 3 && plain.indexOf(tok) > -1) return .5;
    return 0;
  }
  function tscore(tok, e) {
    var best = 0, f, s, syn, j;
    for (f in W) { s = fscore(tok, f, e.h2[f], e.n[f]) * W[f]; if (s > best) best = s; }
    syn = SYN[tok];
    if (syn) for (j = 0; j < syn.length; j++) {
      for (f in { t:1, k:1, d:1 }) { s = fscore(syn[j], f, e.h2[f], e.n[f]) * W[f] * .5; if (s > best) best = s; }
    }
    return best;
  }
  function run(q) {
    var toks = tokens(q), phrase = toks.join(" "), res = [], partial = false;
    if (!toks.length) return { list:[], partial:false };
    function pass(minMatch) {
      var out = [];
      ensure().forEach(function (e) {
        var sum = 0, hit = 0;
        toks.forEach(function (t) { var s = tscore(t, e); if (s > 0) { hit++; sum += s; } });
        if (hit < minMatch) return;
        if (e.n.t.indexOf(phrase) === 0) sum += 8; else if (e.n.t.indexOf(phrase) > -1) sum += 5;
        if (e.n.k.indexOf(phrase) > -1 || e.n.d.indexOf(phrase) > -1) sum += 2;
        out.push({ e:e, s:sum + (e.boost || 0) });
      });
      out.sort(function (a, b) { return b.s - a.s || a.e.order - b.e.order; });
      return out;
    }
    res = pass(toks.length);
    if (!res.length && toks.length > 1) { res = pass(Math.ceil(toks.length / 2)); partial = res.length > 0; }
    return { list:res.slice(0, 10).map(function (r) { return r.e; }), partial:partial, toks:toks };
  }

  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  function didYouMean(q) {
    var toks = norm(q).split(" ").filter(Boolean), changed = false, words = Object.keys(vocab);
    var out = toks.map(function (t) {
      if (t.length < 4 || vocab[t] || words.some(function (w) { return w.indexOf(t) === 0; })) return t;
      var best = null, bd = 99, max = t.length > 6 ? 2 : 1;
      words.forEach(function (w) { var d = lev(t, w, max); if (d <= max && d < bd) { bd = d; best = w; } });
      if (best) { changed = true; return best; }
      return t;
    });
    return changed ? out.join(" ") : "";
  }

  /* ----------------------------------------------------------------- render */
  function el(tag, cls, text) { var n = doc.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function mark(node, text, toks) {
    if (!toks || !toks.length) { node.textContent = text; return; }
    var re = new RegExp("(" + toks.map(esc).join("|") + ")", "ig"), parts = text.split(re);
    parts.forEach(function (p, i) {
      if (!p) return;
      if (i % 2) { var m = doc.createElement("mark"); m.textContent = p; node.appendChild(m); }
      else node.appendChild(doc.createTextNode(p));
    });
  }
  function rawTokens(q) {
    return clean(q).toLowerCase().split(/[^a-z0-9]+/).filter(function (t) { return t.length > 1 && !STOP[t]; });
  }

  var POP = [
    { l:"Drilling Cost Calculator", i:"fa-calculator", q:"drilling cost calculator" },
    { l:"Borewell Drilling Services", i:"fa-oil-well", q:"borewell drilling services" },
    { l:"Book Drilling Service", i:"fa-calendar-check", q:"book drilling service" },
    { l:"Service Areas", i:"fa-location-dot", q:"service areas" },
    { l:"Water Detection", i:"fa-droplet", q:"water detection" },
    { l:"Old Borewell Flushing", i:"fa-faucet-drip", q:"old borewell flushing" }
  ];

  function setActive(i) {
    var items = listEl.querySelectorAll(".sx-item,.sx-pop");
    active = items.length ? (i + items.length) % items.length : -1;
    Array.prototype.forEach.call(items, function (n, k) { n.classList.toggle("is-active", k === active); });
    if (active > -1) { input.setAttribute("aria-activedescendant", items[active].id); items[active].scrollIntoView({ block:"nearest" }); }
    else input.removeAttribute("aria-activedescendant");
  }
  function status(t) { statusEl.textContent = t; }

  function renderIdle() {
    shown = []; emptyEl.hidden = true; emptyEl.textContent = "";
    headEl.textContent = "Popular searches"; headEl.hidden = false;
    listEl.textContent = "";
    POP.forEach(function (p, i) {
      var li = el("li"); li.setAttribute("role", "presentation");
      var b = el("button", "sx-pop"); b.type = "button"; b.id = "sx-opt-" + i; b.tabIndex = -1; b.setAttribute("role", "option"); b.dataset.q = p.q;
      var ic = el("span", "sx-ico"); ic.appendChild(el("i", "fas " + p.i)); ic.firstChild.setAttribute("aria-hidden", "true");
      b.appendChild(ic); b.appendChild(el("span", "sx-title", p.l));
      var go = el("i", "fas fa-arrow-right sx-go"); go.setAttribute("aria-hidden", "true"); b.appendChild(go);
      li.appendChild(b); listEl.appendChild(li);
    });
    active = -1; input.removeAttribute("aria-activedescendant"); status("");
  }

  function renderResults(r, q) {
    shown = r.list; emptyEl.hidden = true; emptyEl.textContent = "";
    headEl.hidden = false;
    headEl.textContent = r.partial ? "Closest matches" : (shown.length + (shown.length === 1 ? " result" : " results"));
    listEl.textContent = "";
    var rt = rawTokens(q);
    shown.forEach(function (e, i) {
      var li = el("li"); li.setAttribute("role", "presentation");
      var a = el("a", "sx-item"); a.id = "sx-opt-" + i; a.href = e.href; a.tabIndex = -1; a.setAttribute("role", "option"); a.dataset.i = i;
      if (e.kind === "external") { a.target = "_blank"; a.rel = "noopener noreferrer"; }
      var ic = el("span", "sx-ico"); var ii = el("i", e.icon); ii.setAttribute("aria-hidden", "true"); ic.appendChild(ii);
      var tx = el("span", "sx-txt"), t = el("span", "sx-title"), d = el("span", "sx-desc");
      mark(t, e.t, rt); mark(d, e.d, rt); tx.appendChild(t); if (e.d) tx.appendChild(d);
      var meta = el("span", "sx-meta"); meta.appendChild(el("span", "sx-tag", e.tag));
      var go = el("i", "fas " + (e.kind === "external" ? "fa-arrow-up-right-from-square" : "fa-arrow-right") + " sx-go"); go.setAttribute("aria-hidden", "true"); meta.appendChild(go);
      a.appendChild(ic); a.appendChild(tx); a.appendChild(meta); li.appendChild(a); listEl.appendChild(li);
    });
    setActive(0);
    status(shown.length + (shown.length === 1 ? " result" : " results") + " available. Use up and down arrows to review.");
  }

  function renderEmpty(q) {
    shown = []; listEl.textContent = ""; headEl.hidden = true;
    emptyEl.hidden = false; emptyEl.textContent = "";
    var box = el("div", "sx-empty");
    var ic = el("div", "sx-empty-ico"); var i = el("i", "fas fa-magnifying-glass"); i.setAttribute("aria-hidden", "true"); ic.appendChild(i); box.appendChild(ic);
    box.appendChild(el("h3", "", "No results for “" + clip(q, 40) + "”"));
    box.appendChild(el("p", "", "Try a different keyword, or ask our team directly — we usually reply quickly."));
    var chips = el("div", "sx-chips"), dym = didYouMean(q);
    function chip(label, query) { var c = el("button", "sx-chip", label); c.type = "button"; c.dataset.q = query; chips.appendChild(c); }
    if (dym) chip("Did you mean “" + dym + "”?", dym);
    chip("Cost calculator", "cost calculator"); chip("Services", "services"); chip("Service areas", "service areas"); chip("Water detection", "water detection"); chip("Contact", "contact");
    box.appendChild(chips);
    var cta = el("div", "sx-cta"), tel = qs('a[href^="tel:"]'), wa = qs('a[href*="wa.me/"]');
    if (tel) { var c = el("a", "sx-call"); c.href = tel.getAttribute("href"); var ci = el("i", "fas fa-phone"); ci.setAttribute("aria-hidden", "true"); c.appendChild(ci); c.appendChild(doc.createTextNode(" Call now")); cta.appendChild(c); }
    if (wa) { var w = el("a", "sx-wa"); w.href = wa.href.split("?")[0]; w.target = "_blank"; w.rel = "noopener noreferrer"; var wi = el("i", "fab fa-whatsapp"); wi.setAttribute("aria-hidden", "true"); w.appendChild(wi); w.appendChild(doc.createTextNode(" WhatsApp")); cta.appendChild(w); }
    if (cta.childNodes.length) box.appendChild(cta);
    emptyEl.appendChild(box);
    input.removeAttribute("aria-activedescendant"); active = -1;
    status("No results found for " + q + ".");
  }

  function update() {
    var q = input.value;
    clearBtn.hidden = !q;
    if (!clean(q) || !norm(q)) { renderIdle(); return; }
    var r = run(q);
    r.list.length ? renderResults(r, q) : renderEmpty(q);
  }

  /* ------------------------------------------------------------- navigation */
  function resolve(e) {
    var c = [e.el], i, n;
    for (i = 0; i < e.sel.length; i++) c.push(qs(e.sel[i]));
    for (i = 0; i < e.fb.length; i++) c.push(qs(e.fb[i]));
    for (i = 0; i < c.length; i++) if (c[i] && rendered(c[i])) return c[i];
    for (i = 0; i < c.length; i++) if (c[i] && (n = renderedOrAncestor(c[i]))) return n;
    return null;
  }
  function headerOffset() { return (navbar ? navbar.getBoundingClientRect().height : 0) + 14; }
  function scrollToEl(target) {
    var y = target.getBoundingClientRect().top + window.pageYOffset - headerOffset();
    window.scrollTo({ top:Math.max(0, y), behavior:reduceMotion ? "auto" : "smooth" });
    setTimeout(function () {                              /* correct for late layout shifts (lazy images) */
      var d = target.getBoundingClientRect().top - headerOffset();
      if (Math.abs(d) > 40) window.scrollTo({ top:Math.max(0, window.pageYOffset + d), behavior:"auto" });
    }, reduceMotion ? 80 : 900);
  }
  function flash(target) {
    target.classList.remove("sx-flash"); void target.offsetWidth; target.classList.add("sx-flash");
    setTimeout(function () { target.classList.remove("sx-flash"); }, 2000);
  }
  function go(e) {
    var target = resolve(e); if (!target) return;
    var det = target.closest("details"); if (det) det.open = true;
    if (target.tagName === "DETAILS") target.open = true;
    if (target.id && window.history && history.pushState) { try { history.pushState(null, "", "#" + target.id); } catch (x) {} }
    scrollToEl(target); flash(target);
  }

  /* ------------------------------------------------------- open / close ui */
  function setTop() {
    var b = navbar ? navbar.getBoundingClientRect().bottom : 0;
    root.style.setProperty("--sx-top", Math.max(0, Math.round(b)) + "px");
  }
  function setVh() {
    var h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    root.style.setProperty("--sx-vh", Math.round(h) + "px");
    var bn = qs(".pwa-bottom-nav");                       /* keep the panel clear of the mobile bottom bar */
    root.style.setProperty("--sx-bottom", (bn && rendered(bn) ? bn.offsetHeight : 0) + "px");
  }
  var raf = 0;
  function reflow() { if (!isOpen || raf) return; raf = requestAnimationFrame(function () { raf = 0; setTop(); setVh(); }); }

  function open() {
    if (isOpen) return;
    ensure();
    var navLinks = doc.getElementById("navLinks");
    if (navLinks && navLinks.classList.contains("active")) { var mc = doc.getElementById("mnavClose"); if (mc) mc.click(); }
    isOpen = true; setTop(); setVh();
    panel.classList.add("is-open"); backdrop.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    input.value = ""; update();
    input.focus({ preventScroll:true });
  }
  function close(returnFocus) {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove("is-open"); backdrop.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    if (returnFocus) trigger.focus({ preventScroll:true });
  }

  trigger.addEventListener("click", function (ev) { ev.stopPropagation(); isOpen ? close(true) : open(); });
  closeBtn.addEventListener("click", function () { close(true); });
  backdrop.addEventListener("click", function () { close(false); });
  clearBtn.addEventListener("click", function () { input.value = ""; update(); input.focus({ preventScroll:true }); });
  input.addEventListener("input", update);

  doc.addEventListener("click", function (ev) {            /* click anywhere outside (e.g. on the header) */
    if (isOpen && !panel.contains(ev.target) && !trigger.contains(ev.target)) close(false);
  });
  var menuBtn = doc.getElementById("menuToggle");
  if (menuBtn) menuBtn.addEventListener("click", function () { close(false); });

  function runQuery(q) { input.value = q; update(); input.focus({ preventScroll:true }); }

  panel.addEventListener("click", function (ev) {
    var chip = ev.target.closest(".sx-chip,.sx-pop");
    if (chip && chip.dataset.q) { runQuery(chip.dataset.q); return; }
    var a = ev.target.closest(".sx-item"); if (!a) return;
    var e = shown[+a.dataset.i]; if (!e) return;
    if (e.kind !== "section") { close(false); return; } /* real link: let the browser open it */
    ev.preventDefault(); ev.stopPropagation(); close(false); go(e);
  });

  input.addEventListener("keydown", function (ev) {
    var n = listEl.querySelectorAll(".sx-item,.sx-pop").length;
    if (ev.key === "ArrowDown") { ev.preventDefault(); if (n) setActive(active + 1); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); if (n) setActive(active < 0 ? n - 1 : active - 1); }
    else if (ev.key === "Enter") {
      var items = listEl.querySelectorAll(".sx-item,.sx-pop");
      var t = items[active > -1 ? active : 0];
      if (t) { ev.preventDefault(); t.click(); }
    }
  });
  doc.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && isOpen) { ev.preventDefault(); close(true); return; }
    var tag = (ev.target && ev.target.tagName) || "", typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (ev.target && ev.target.isContentEditable);
    if (((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") || (ev.key === "/" && !typing && !ev.ctrlKey && !ev.metaKey && !ev.altKey)) {
      ev.preventDefault(); isOpen ? input.focus() : open();
    }
  });

  window.addEventListener("resize", reflow);
  window.addEventListener("scroll", reflow, { passive:true });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", reflow);
  if (navbar) navbar.addEventListener("transitionend", reflow);

  /* direct links to a result (e.g. index.html#sx-how-long-does-a-drilling-project-usually-take) */
  function arrive() {
    ensure();
    var h = decodeURIComponent((location.hash || "").slice(1)), t = h && doc.getElementById(h);
    if (!t || !/^sx-/.test(h)) return;
    var d = t.closest("details"); if (d) d.open = true;
    scrollToEl(t); flash(t);
  }
  window.addEventListener("load", function () { ensure(); if (location.hash) setTimeout(arrive, 350); });
  window.addEventListener("hashchange", arrive);

  /* mobile: shrink the company name just enough to show it in full (no "…") */
  (function fitBrand() {
    var h = doc.querySelector(".navbar .brand-title");
    if (!h) return;
    var mq = window.matchMedia("(max-width: 860px)"), t = 0;
    function run() {
      h.style.fontSize = "";
      if (!mq.matches) return;
      var size = parseFloat(getComputedStyle(h).fontSize) || 16;
      while (h.scrollWidth > h.clientWidth + 0.5 && size > 9) { size -= 0.5; h.style.fontSize = size + "px"; }
    }
    function later() { clearTimeout(t); t = setTimeout(run, 80); }
    window.addEventListener("resize", later);
    window.addEventListener("orientationchange", later);
    window.addEventListener("load", run);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(run);
    run();
  })();

  window.smfdSearch = { open:open, close:function () { close(false); } };
})();
;

/* ================= about-tilt.js (was inline in index.html) ================= */
/* 3D glass: gentle tilt + moving highlight (desktop pointers only) */
(function(){
  var sc=document.querySelector('.about-scene'); if(!sc) return;
  var g=sc.querySelector('#about1');
  if(!window.matchMedia('(hover:hover) and (pointer:fine)').matches||window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  sc.addEventListener('pointermove',function(e){
    var r=g.getBoundingClientRect(), x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height;
    g.style.setProperty('--ry',((x-.5)*5).toFixed(2)+'deg');
    g.style.setProperty('--rx',((.5-y)*4).toFixed(2)+'deg');
    sc.style.setProperty('--sx',(x*100).toFixed(1)+'%'); sc.style.setProperty('--sy',(y*100).toFixed(1)+'%');
  });
  sc.addEventListener('pointerleave',function(){ g.style.setProperty('--rx','0deg'); g.style.setProperty('--ry','0deg'); });
})();
;
