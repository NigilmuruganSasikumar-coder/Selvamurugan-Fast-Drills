/* ================= calc-ui.js ================= */
/* Desktop: Price Setting + GST sit under "Select Drilling Mode"; mobile: inline with the buttons */
(function(){
  var box=document.getElementById('pgBox'),
      left=document.getElementById('leftCol'),
      actions=document.getElementById('calcActions');
  if(!box||!left||!actions) return;
  var mq=window.matchMedia('(min-width: 901px)');
  function place(){
    if(mq.matches){ left.appendChild(box); box.classList.add('pg-box--side'); }   /* last child: under the rate info */
    else { actions.insertBefore(box,actions.firstChild); box.classList.remove('pg-box--side'); }
  }
  place();
  if(mq.addEventListener) mq.addEventListener('change',place); else mq.addListener(place);
})();
/* Calculator: +/- steppers and Price Setting toggle (UI only; does not touch calculation code) */
(function(){
  var root=document.getElementById('calculator-section'); if(!root) return;
  root.addEventListener('click',function(e){
    var b=e.target.closest('.step-btn');
    if(b){
      var i=document.getElementById(b.dataset.target); if(!i) return;
      var v=(parseFloat(i.value)||0)+(+b.dataset.dir)*(+b.dataset.step||10);
      i.value=Math.max(0,v);
      i.dispatchEvent(new Event('input',{bubbles:true}));
      i.dispatchEvent(new Event('change',{bubbles:true}));
      return;
    }
    if(e.target.closest('#priceSettingBtn')){ if(window.togglePriceSettings) window.togglePriceSettings(); }
  });
})();
;

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

/* ================= price-settings.js ================= */
/* Price Settings = the single source of truth for every rate the calculator uses.

   - Base / rebore / PVC rates and bore bata: edited here, Save writes them into the
     live calculator inputs (baseRate, reboreRate, casing7Rate, casing10Rate, boreBata).
   - Slab rate PATTERN (+5, +10, 2x(+5), 2x(+10), 2:+5, 2:+10): chosen in the calculator
     (#stepRate select). The step added by each slab comes from the table below, and any
     step can be overridden per slab in this panel.
   - Transport / other charges and the final step: saved here, read by the calculator.

   Load AFTER script1.js and BEFORE script.js. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  var KEY = 'smfd_price_settings_v2';
  var OLD_KEY = 'smfd_price_settings_v1';
  var LIVE = { base: 'baseRate', rebore: 'reboreRate', p7: 'casing7Rate', p10: 'casing10Rate', bata: 'boreBata' };
  var FIRST_END = 300, SLAB_LEN = 100;
  var DEFAULT_PATTERN = 'slab5', DEFAULT_TAIL = 100;

  /* Step added by each slab, starting at slab 2 (301-400). Once a pattern's list runs out,
     every further slab adds the "final step" (default 100). From the handwritten table. */
  var PATTERNS = {
    slab5:  { label: 'Slab rate +5',  steps: [5, 10, 20, 30, 40, 50, 60] },
    slab10: { label: 'Slab rate +10', steps: [10, 20, 30, 40, 50, 60, 70] },
    x2_5:   { label: '2\u00D7 (+5)',  steps: [5, 5, 10, 10, 20, 20, 30] },
    x2_10:  { label: '2\u00D7 (+10)', steps: [10, 10, 20, 20, 30, 30, 40] },
    c2_5:   { label: '2 : +5',        steps: [5, 5, 10, 20, 30, 40] },
    c2_10:  { label: '2 : +10',       steps: [10, 10, 20, 30, 40, 50] }
  };

  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function pad(n) { n = String(n); while (n.length < 3) n = '0' + n; return n; }
  function inr(n) { return Math.round(n).toLocaleString('en-IN'); }
  function liveVal(id) { var e = $(id); return e ? e.value : ''; }
  function setLive(id, v) {
    var e = $(id); if (!e) return;
    e.value = v;
    e.dispatchEvent(new Event('input', { bubbles: true }));
    e.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function readStore() {
    try { var o = JSON.parse(localStorage.getItem(KEY)); if (o) return o; } catch (e) {}
    try { /* carry over the charges saved by the previous version; its step data is not compatible */
      var old = JSON.parse(localStorage.getItem(OLD_KEY)) || {};
      return { bata: old.bata, bataOn: old.bataOn, transport: old.transport, transportOn: old.transportOn,
               other: old.other, otherOn: old.otherOn };
    } catch (e) {}
    return {};
  }
  function writeStore(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

  /* ---------------- rate engine (shared with the calculator) ---------------- */
  function patternId(id) { return PATTERNS[id] ? id : DEFAULT_PATTERN; }
  function currentPatternId() { var el = $('stepRate'); return patternId(el && el.value); }
  function normCfg(st) {
    return { tail: st.tail != null ? num(st.tail) : DEFAULT_TAIL, overrides: st.overrides || {} };
  }
  function slabIndex(ft) { return ft <= FIRST_END ? 1 : 1 + Math.ceil((ft - FIRST_END) / SLAB_LEN); }
  function slabBounds(k) {
    return k === 1 ? { from: 1, to: FIRST_END }
                   : { from: FIRST_END + (k - 2) * SLAB_LEN + 1, to: FIRST_END + (k - 1) * SLAB_LEN };
  }
  function defaultStep(pid, k, tail) { var arr = PATTERNS[pid].steps; return k - 2 < arr.length ? arr[k - 2] : tail; }
  function stepOf(cfg, pid, k) {
    var ov = cfg.overrides && cfg.overrides[pid];
    if (ov && ov[k] != null) return num(ov[k]);
    return defaultStep(pid, k, cfg.tail);
  }
  /* returns function(k) -> rate (Rs/ft) of slab k: base + every step from slab 2 up to k */
  function makeRateFn(cfg, pid, base) {
    var cache = [0, base];
    return function (k) {
      while (cache.length <= k) { var i = cache.length; cache.push(cache[i - 1] + stepOf(cfg, pid, i)); }
      return cache[k];
    };
  }
  function slabRows(cfg, pid, base, d) {
    var n = slabIndex(d > 0 ? d : 1), rate = makeRateFn(cfg, pid, base), rows = [];
    for (var k = 1; k <= n; k++) {
      var b = slabBounds(k), to = b.to;
      if (d > 0 && to > d) to = d;
      rows.push({ n: k, from: b.from, to: to, step: k === 1 ? 0 : stepOf(cfg, pid, k), rate: rate(k) });
    }
    return rows;
  }
  function depth() { return num(liveVal('depth')); }

  function publicApi() {
    var st = readStore(), cfg = normCfg(st), pid = currentPatternId(), base = num(liveVal(LIVE.base));
    return {
      pattern: pid, patternLabel: PATTERNS[pid].label,
      baseRate: base, reboreRate: num(liveVal(LIVE.rebore)),
      pvc7Rate: num(liveVal(LIVE.p7)), pvc10Rate: num(liveVal(LIVE.p10)),
      boreBata: num(liveVal(LIVE.bata)),
      transportCharge: st.transportOn ? num(st.transport) : 0,
      otherCharges: st.otherOn ? num(st.other) : 0,
      slabs: slabRows(cfg, pid, base, depth()),
      rateForDepth: function (d) { return makeRateFn(normCfg(readStore()), currentPatternId(), num(liveVal(LIVE.base)))(slabIndex(d)); }
    };
  }

  /* what script.js (the calculator) uses */
  window.PriceSettings = {
    patterns: PATTERNS,
    patternId: currentPatternId,
    patternLabel: function () { return PATTERNS[currentPatternId()].label; },
    slabIndex: slabIndex,
    slabBounds: slabBounds,
    rateFn: function (base, pid) {            /* reads the SAVED settings each time it is called */
      return makeRateFn(normCfg(readStore()), patternId(pid || currentPatternId()), base);
    },
    getCharges: function () {
      var st = readStore();
      return { transport: st.transportOn ? num(st.transport) : 0, other: st.otherOn ? num(st.other) : 0 };
    }
  };

  var box = $('priceSettingsContainer');
  if (!box) return;

  /* ---------------- panel: draft -> Save ---------------- */
  var overrides = {};   /* draft per-slab step overrides: { patternId: { slabNumber: step } } */

  function draftCfg() { return { tail: num($('psStepRate').value), overrides: overrides }; }

  function snapshot() {
    return {
      base: num($('psBase').value), rebore: num($('psRebore').value),
      p7: num($('ps7').value), p10: num($('ps10').value),
      bata: num($('psBata').value), bataOn: $('psBataOn').checked,
      transport: num($('psTransport').value), transportOn: $('psTransportOn').checked,
      other: num($('psOther').value), otherOn: $('psOtherOn').checked,
      tail: num($('psStepRate').value)
    };
  }

  function cleanOverrides() {
    var out = {};
    Object.keys(overrides).forEach(function (p) {
      if (PATTERNS[p] && Object.keys(overrides[p]).length) out[p] = overrides[p];
    });
    return out;
  }

  /* "Step rate" box in the panel mirrors the Slab Rate chosen in the calculator */
  function fillPatternSelect() {
    var sel = $('psPattern');
    if (!sel || sel.options.length) return;
    Object.keys(PATTERNS).forEach(function (id) {
      var o = document.createElement('option'); o.value = id; o.textContent = PATTERNS[id].label; sel.appendChild(o);
    });
  }
  function syncPattern() { var sel = $('psPattern'); if (sel) sel.value = currentPatternId(); }

  function load() {
    var st = readStore(), cfg = normCfg(st);
    fillPatternSelect();
    syncPattern();
    $('psBase').value = liveVal(LIVE.base);
    $('psRebore').value = liveVal(LIVE.rebore);
    $('ps7').value = liveVal(LIVE.p7);
    $('ps10').value = liveVal(LIVE.p10);
    var liveBata = num(liveVal(LIVE.bata));
    $('psBata').value = st.bata != null ? st.bata : liveVal(LIVE.bata);
    $('psBataOn').checked = st.bataOn != null ? st.bataOn : liveBata > 0;
    $('psTransport').value = st.transport != null ? st.transport : '';
    $('psTransportOn').checked = !!st.transportOn;
    $('psOther').value = st.other != null ? st.other : '';
    $('psOtherOn').checked = !!st.otherOn;
    $('psStepRate').value = cfg.tail;
    overrides = JSON.parse(JSON.stringify(cfg.overrides));
    render();
  }

  function renderLeft() {
    var pid = currentPatternId(), list = slabRows(draftCfg(), pid, num($('psBase').value), depth());
    var h = '<div class="ps-table-head"><span>Slab (ft)</span><span>Step rate</span></div>';
    list.forEach(function (sl) {
      var name = '<span class="ps-slab-name">' + pad(sl.from) + ' - ' + sl.to + ' ft</span>';
      if (sl.n === 1) {
        h += '<div class="ps-table-row">' + name + '<div class="ps-step-cell"><span class="ps-base-tag">Base rate</span></div></div>';
      } else {
        h += '<div class="ps-table-row">' + name + '<div class="ps-step-cell"><label class="ps-mini"><span>+ \u20B9</span>' +
          '<input type="number" min="0" data-k="' + sl.n + '" value="' + sl.step + '" aria-label="Step rate for slab ' + sl.n + '"></label></div></div>';
      }
    });
    $('psSlabLeft').innerHTML = h;
  }

  function renderRight() {
    var pid = currentPatternId(), base = num($('psBase').value), list = slabRows(draftCfg(), pid, base, depth());
    $('psChipBase').textContent = '\u20B9' + inr(base);
    $('psChipRebore').textContent = '\u20B9' + inr(num($('psRebore').value));
    var chip = $('psChipPattern'); if (chip) chip.textContent = PATTERNS[pid].label;
    var h = '<div class="ps-table-head"><span>Slab (ft)</span><span>Rate</span></div>';
    list.forEach(function (sl) {
      h += '<div class="ps-table-row"><span class="ps-slab-name">' + pad(sl.from) + ' - ' + sl.to + ' ft</span>' +
        '<span class="ps-rate-cell"><b class="rs">\u20B9</b>' + inr(sl.rate) + ' <small>/ ft</small></span></div>';
    });
    $('psSlabRight').innerHTML = h;
  }

  function render() { renderLeft(); renderRight(); }

  function flash(msg) {
    var el = $('psStatus'); el.textContent = msg; el.classList.add('show');
    clearTimeout(flash.t); flash.t = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  /* ---- events ---- */
  box.addEventListener('input', function (e) {
    var t = e.target;
    if (t.matches && t.matches('[data-k]')) {
      var k = +t.dataset.k, pid = currentPatternId(), v = num(t.value);
      var ov = overrides[pid] = overrides[pid] || {};
      if (v === defaultStep(pid, k, num($('psStepRate').value))) delete ov[k]; else ov[k] = v;
      renderRight(); return;
    }
    if (t.id === 'psStepRate') { render(); return; }   /* final step changed: slabs past the pattern follow it */
    if (t.id === 'psBase' || t.id === 'psRebore') renderRight();
  });

  /* total depth or slab-rate pattern changed in the calculator -> table follows */
  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'depth' && !box.hasAttribute('hidden')) render();
  });
  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'stepRate') { syncPattern(); if (!box.hasAttribute('hidden')) render(); }
  });

  /* picking a pattern in the panel sets the calculator's Slab Rate (same choice, two places) */
  box.addEventListener('change', function (e) {
    if (!e.target || e.target.id !== 'psPattern') return;
    var calc = $('stepRate'); if (!calc) return;
    calc.value = e.target.value;
    calc.dispatchEvent(new Event('change', { bubbles: true }));
  });

  box.addEventListener('click', function (e) {
    if (e.target.closest('#psReset')) { load(); flash('Reset to last saved values'); return; }
    if (e.target.closest('#psClose')) { window.togglePriceSettings(false); return; }
    if (e.target.closest('#psSave')) {
      var s = snapshot();
      /* store first, so anything recalculating off the input events below already sees the new steps/charges */
      writeStore({ bata: s.bata, bataOn: s.bataOn, transport: s.transport, transportOn: s.transportOn,
        other: s.other, otherOn: s.otherOn, tail: s.tail, overrides: cleanOverrides() });
      setLive(LIVE.base, s.base); setLive(LIVE.rebore, s.rebore);
      setLive(LIVE.p7, s.p7); setLive(LIVE.p10, s.p10);
      setLive(LIVE.bata, s.bataOn ? s.bata : 0);
      window.priceSettings = publicApi();
      document.dispatchEvent(new CustomEvent('pricesettings:save', { detail: window.priceSettings }));
      flash('Saved \u2713');
      window.togglePriceSettings(false);   /* saved -> close the panel */
    }
  });

  window.togglePriceSettings = function (force) {
    var open = box.hasAttribute('hidden');
    if (typeof force === 'boolean') open = force;
    if (open) { load(); box.removeAttribute('hidden'); box.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else box.setAttribute('hidden', '');
    var b = $('priceSettingBtn');
    if (b) { b.setAttribute('aria-expanded', open); b.classList.toggle('open', open); }
  };

  load();
  window.priceSettings = publicApi();
})();
;

/* ================= script.js ================= */
/* ==========================================================================
   script.js — CALCULATOR (borewell cost logic + bore-type rate/bata)
   ========================================================================== */

let drillingMode = "new";

function setMode(mode){

    drillingMode = mode;

    document.getElementById("newBtn")
    .classList.remove("active");

    document.getElementById("reboreBtn")
    .classList.remove("active");

    if(mode === "new"){

        document.getElementById("newBtn")
        .classList.add("active");

    }

    else{

        document.getElementById("reboreBtn")
        .classList.add("active");

    }

    document
    .querySelectorAll(".rebore-fields")
    .forEach(el=>{

        el.style.display =
        mode === "rebore"
        ? "flex"
        : "none";

    });


}



function calculateTotal(){

    document.querySelector(".details-box")
    .style.display = "block";

    document.querySelector(".breakdown-box")
    .style.display = "block";

    document.querySelector(".result-box")
    .style.display = "flex";

    let depth =
    parseInt(document.getElementById("depth").value) || 0;

    let baseRate =
    parseInt(document.getElementById("baseRate").value) || 0;

    let casing7Feet =
    parseInt(document.getElementById("casing7").value) || 0;

    let casing7Rate =
    parseInt(document.getElementById("casing7Rate").value) || 0;

    let casing10Feet =
    parseInt(document.getElementById("casing10").value) || 0;

    let casing10Rate =
    parseInt(document.getElementById("casing10Rate").value) || 0;



    // Every slab rate comes from Price Settings (price-settings.js):
    // base rate + the step of each slab for the pattern chosen in "Slab Rate".
    const PS = window.PriceSettings;

    if(!PS){
        alert("Price Settings did not load. Please refresh the page.");
        return;
    }

    const rateForSlab = PS.rateFn(baseRate);

    let start = 1;

    let drillingTotal = 0;

    let breakdownHTML = "";



    // =========================
    // REBORE SECTION
    // =========================

    if(drillingMode === "rebore"){

        let reboreFeet =
        parseInt(document.getElementById("reboreFeet").value) || 0;

        let reboreRate =
        parseInt(document.getElementById("reboreRate").value) || 0;



        // REBORE COST

        let reboreCost =
        reboreFeet * reboreRate;

        drillingTotal += reboreCost;



        // SHOW REBORE ROW

        breakdownHTML += `

        <div class="breakdown-row">

            <div>
                1-${reboreFeet} ft
            </div>

            <div>
                ₹${reboreRate}/ft
            </div>

            <div class="amount">
                Rs.${reboreCost.toLocaleString()}
            </div>

        </div>

        `;



        // The rest of the depth is priced by its position (same slab rates as a new bore)

        start = reboreFeet + 1;

    }



    // =========================
    // SLAB CALCULATION
    // =========================

    while(start <= depth){

        let slabNo = PS.slabIndex(start);

        // slab boundaries are fixed: 1-300, 301-400, 401-500 ...
        let end = Math.min(PS.slabBounds(slabNo).to, depth);

        let feet =
        end - start + 1;

        let currentRate = rateForSlab(slabNo);

        let slabCost =
        feet * currentRate;



        drillingTotal += slabCost;



        breakdownHTML += `

        <div class="breakdown-row">

            <div>
                ${String(start).padStart(3,'0')}-${end} ft
            </div>

            <div>
                ₹${currentRate}/ft
            </div>

            <div class="amount">
                Rs.${slabCost.toLocaleString()}
            </div>

        </div>

        `;



        start = end + 1;

    }



    // PVC COSTS

    let casing7Cost =
    casing7Feet * casing7Rate;

    let casing10Cost =
    casing10Feet * casing10Rate;



    // SUBTOTAL

    let subtotal =

    drillingTotal
    +
    casing7Cost
    +
    casing10Cost;



    // GST

    let gst = 0;

    if(document.getElementById("gstToggle").checked){

        gst = subtotal * 0.18;

    }



    // FINAL TOTAL

    let total =
    subtotal + gst;



    // DETAILS

    document.getElementById("detailsText")
    .innerHTML =

    `
    Total Depth:
    <b>${depth} ft</b>

    |

    Base Rate:
    <b>₹${baseRate}/ft</b>

    |

    Mode:
    <b>${drillingMode.toUpperCase()}</b>

    |

    Slab Rate:
    <b>${PS.patternLabel()}</b>

    |

    7" PVC:
    <b>${casing7Feet} ft</b>

    |

    10" PVC:
    <b>${casing10Feet} ft</b>
    `;



    // BREAKDOWN

    document.getElementById("breakdown")
    .innerHTML =
    breakdownHTML;



    // RESULTS

    document.getElementById("drillingTotal")
    .innerHTML =
    "₹" + drillingTotal.toLocaleString();

    document.getElementById("casing7Total")
    .innerHTML =
    "₹" + casing7Cost.toLocaleString();

    document.getElementById("casing10Total")
    .innerHTML =
    "₹" + casing10Cost.toLocaleString();

    document.getElementById("gstAmount")
    .innerHTML =
    "₹" + gst.toLocaleString();

    document.getElementById("grandTotal")
    .innerHTML =
    "₹" + total.toLocaleString();

}



function clearCalculator(){

    document.getElementById("depth").value = "600";

    document.getElementById("baseRate").value = "90";

    document.getElementById("reboreFeet").value = "0";

    document.getElementById("reboreRate").value = "40";

    document.getElementById("casing7").value = "40";

    document.getElementById("casing7Rate").value = "450";

    document.getElementById("casing10").value = "20";

    document.getElementById("casing10Rate").value = "750";

    document.getElementById("gstToggle").checked = false;

    syncGstLabel();

    var slabSel = document.getElementById("stepRate");

    if(slabSel) slabSel.value = "slab5";

    document.getElementById("detailsText").innerHTML = "";

    document.getElementById("breakdown").innerHTML = "";

    document.getElementById("drillingTotal").innerHTML = "₹0";

    document.getElementById("casing7Total").innerHTML = "₹0";

    document.getElementById("casing10Total").innerHTML = "₹0";

    document.getElementById("gstAmount").innerHTML = "₹0";

    document.getElementById("grandTotal").innerHTML = "₹0";

}
const today = new Date();

const formattedDate =

today.getDate() + "-" +
(today.getMonth()+1) + "-" +
today.getFullYear();

document.getElementById("todayDate")
.innerHTML = formattedDate;

function openQuotation() {

    // Customer + drilling details are compulsory
    if (!validateQuotation()) return;

    // Calculate latest values
    calculateTotal();

    const quotationData = {

        customerName: document.getElementById("customerName").value,
        customerPhone: document.getElementById("customerPhone").value,

        mode: drillingMode,

        depth: document.getElementById("depth").value,
        baseRate: document.getElementById("baseRate").value,

        reboreFeet: document.getElementById("reboreFeet").value,
        reboreRate: document.getElementById("reboreRate").value,

        casing7: document.getElementById("casing7").value,
        casing7Rate: document.getElementById("casing7Rate").value,

        casing10: document.getElementById("casing10").value,
        casing10Rate: document.getElementById("casing10Rate").value,

        boreType: document.getElementById("boreType") ? document.getElementById("boreType").value : "",
        boreBata: document.getElementById("boreBata") ? document.getElementById("boreBata").value : "0",

        stepRateLabel: (function(){
            var s = document.getElementById("stepRate");
            return (s && s.selectedIndex >= 0) ? s.options[s.selectedIndex].text : "";
        })(),

        siteAddress: document.getElementById("siteAddress") ? document.getElementById("siteAddress").value : "",

        slabPattern: window.PriceSettings ? window.PriceSettings.patternLabel() : "",

        gst: document.getElementById("gstToggle").checked,

        generatedAt: new Date().toISOString()

    };

    localStorage.setItem(
        "quotationData",
        JSON.stringify(quotationData)
    );

    // Open quotation page
    window.open(
        "quotation.html",
        "_blank"
    );

}


/* ==========================================================================
   BORE TYPE + BORE BATA (moved from inline <script> in index.html)
   Wraps calculateAndDisplay() from ui.js once the page has loaded.
   ========================================================================== */
// ---- Bore Type rate auto-fill ----
const BORE_RATE_MAP = {
  '4.5': { min: 70,  max: 90  },
  '6':   { min: 90,  max: 110 },
  '6.5': { min: 90,  max: 110 },
  '7.5': { min: 130, max: 180 },
  '8':   { min: 130, max: 180 },
  '8.5': { min: 130, max: 180 },
  '10':  { min: 160, max: 210 },
  '12':  { min: 160, max: 210 },
};

function updateBoreTypeRate() {
  var sel = document.getElementById('boreType');
  var baseRateInput = document.getElementById('baseRate');
  if (!sel || !baseRateInput) return;
  var val = sel.value;
  if (val && BORE_RATE_MAP[val]) {
    var r = BORE_RATE_MAP[val];
    // Set to midpoint of the range as a sensible default
    var mid = Math.round((r.min + r.max) / 2);
    baseRateInput.value = mid;
  }
}

// ---- Patch calculateAndDisplay to include bore bata ----
// We wrap the original function (defined in script.js) after it loads.
window.addEventListener('load', function () {
  var _origCalc = window.calculateAndDisplay;
  if (typeof _origCalc === 'function') {
    window.calculateAndDisplay = function () {
      _origCalc.apply(this, arguments);
      injectBoreBata();
    };
  }
});

function injectBoreBata() {
  var boreBataInput = document.getElementById('boreBata');
  var boreTypeSel   = document.getElementById('boreType');
  var summaryBoreBataEl  = document.getElementById('summaryBoreBata');
  var summaryBoreTypeEl  = document.getElementById('summaryBoreType');
  var summarySubtotalEl  = document.getElementById('summarySubtotal');
  var summaryGSTEl       = document.getElementById('summaryGST');
  var summaryTotalEl     = document.getElementById('summaryTotal');
  var grandTotalEl       = document.getElementById('grandTotal');
  var boreBataLine       = document.getElementById('boreBataLine');
  var transportLine      = document.getElementById('transportLine');
  var otherLine          = document.getElementById('otherChargesLine');
  var summaryTransportEl = document.getElementById('summaryTransport');
  var summaryOtherEl     = document.getElementById('summaryOther');

  if (!boreBataInput || !summarySubtotalEl) return;

  var boreBata    = parseFloat(boreBataInput.value) || 0;
  var boreTypeVal = boreTypeSel ? boreTypeSel.value : '';
  var boreLabel   = boreTypeVal ? boreTypeVal + '″ Bore' : '–';

  // Update bore bata summary line
  if (summaryBoreBataEl)  summaryBoreBataEl.textContent  = '₹' + fmt(boreBata);
  if (summaryBoreTypeEl)  summaryBoreTypeEl.textContent  = boreLabel;
  if (boreBataLine) boreBataLine.style.display = boreBata > 0 ? '' : 'none';

  // Transport + other charges (saved in Price Settings, only when switched on there)
  var charges = window.PriceSettings ? window.PriceSettings.getCharges() : { transport: 0, other: 0 };
  if (summaryTransportEl) summaryTransportEl.textContent = '₹' + fmt(charges.transport);
  if (summaryOtherEl)     summaryOtherEl.textContent     = '₹' + fmt(charges.other);
  if (transportLine) transportLine.style.display = charges.transport > 0 ? '' : 'none';
  if (otherLine)     otherLine.style.display     = charges.other > 0 ? '' : 'none';

  // Read what script.js already computed for subtotal, GST, total
  var rawSubtotal = parseRs(summarySubtotalEl.textContent);
  var gstChecked  = document.getElementById('gstToggle') ? document.getElementById('gstToggle').checked : false;

  // New subtotal = old subtotal + bore bata + transport + other charges
  var newSubtotal = rawSubtotal + boreBata + charges.transport + charges.other;
  var newGST      = gstChecked ? Math.round(newSubtotal * 0.18) : 0;
  var newTotal    = newSubtotal + newGST;

  if (summarySubtotalEl) summarySubtotalEl.textContent = '₹' + fmt(newSubtotal);
  if (summaryGSTEl)      summaryGSTEl.textContent      = '₹' + fmt(newGST);
  if (summaryTotalEl)    summaryTotalEl.textContent    = '₹' + fmt(newTotal);
  if (grandTotalEl)      grandTotalEl.textContent      = '₹' + fmt(newTotal);
}

function parseRs(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
}

function fmt(n) {
  return Math.round(n).toLocaleString('en-IN');
}


/* ==========================================================================
   Keep the results in step with Price Settings / the Slab Rate choice
   ========================================================================== */
function recalcIfResultsVisible() {
  var box = document.querySelector('.breakdown-box');
  if (!box || box.style.display === 'none') return;      // nothing calculated yet
  if (typeof window.calculateAndDisplay === 'function') window.calculateAndDisplay();
  else calculateTotal();
}

document.addEventListener('pricesettings:save', recalcIfResultsVisible);

document.addEventListener('change', function (e) {
  if (e.target && e.target.id === 'stepRate') recalcIfResultsVisible();
});



/* ==========================================================================
   GST label (ON / OFF) - GST is OFF by default
   ========================================================================== */
function syncGstLabel() {
  var t = document.getElementById('gstToggle');
  var b = t && t.parentNode ? t.parentNode.querySelector('b') : null;
  if (b) b.textContent = t.checked ? 'ON' : 'OFF';
}
syncGstLabel();
document.addEventListener('change', function (e) {
  if (e.target && e.target.id === 'gstToggle') syncGstLabel();
});


/* ==========================================================================
   View Quotation: customer details + drilling details must be filled
   ========================================================================== */
function validateQuotation() {
  var filled = function (v) { return String(v == null ? '' : v).trim() !== ''; };
  var positive = function (v) { return parseFloat(v) > 0; };

  var checks = [
    ['customerName',  'Customer Name', filled],
    ['customerPhone', 'Phone Number',  filled],
    ['siteAddress',   'Site Address',  filled],
    ['boreType',      'Bore Type',     filled],
    ['stepRate',      'Slab Rate',     filled],
    ['depth',         'Total Depth',   positive],
    ['baseRate',      'Base Rate',     positive]
  ];
  if (drillingMode === 'rebore') checks.push(['reboreFeet', 'Rebore Depth', positive]);

  document.querySelectorAll('.qv-missing').forEach(function (n) { n.classList.remove('qv-missing'); });

  var missing = [];
  checks.forEach(function (c) {
    var el = document.getElementById(c[0]);
    if (!el || c[2](el.value)) return;
    (el.closest('.field') || el).classList.add('qv-missing');
    missing.push({ el: el, label: c[1] });
  });

  var msg = document.getElementById('quoteMissingMsg');
  if (!missing.length) {
    if (msg) { msg.hidden = true; msg.textContent = ''; }
    return true;
  }

  if (msg) {
    msg.textContent = 'Please fill in the required details before viewing the quotation: ' +
      missing.map(function (m) { return m.label; }).join(', ') + '.';
    msg.hidden = false;
  }
  var first = missing[0].el;
  first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  try { first.focus({ preventScroll: true }); } catch (err) {}
  return false;
}

// clear the red mark as soon as the field is filled in
function clearQuotationMark(e) {
  var f = e.target && e.target.closest ? e.target.closest('.qv-missing') : null;
  if (!f) return;
  f.classList.remove('qv-missing');
  if (!document.querySelector('.qv-missing')) {
    var msg = document.getElementById('quoteMissingMsg');
    if (msg) { msg.hidden = true; msg.textContent = ''; }
  }
}
document.addEventListener('input', clearQuotationMark);
document.addEventListener('change', clearQuotationMark);


/* ==========================================================================
   Drilling Rate Info container: the eye button shows / hides the rates
   ========================================================================== */
document.addEventListener('click', function (e) {
  var btn = e.target && e.target.closest ? e.target.closest('#driViewBtn') : null;
  if (!btn) return;
  var rates = document.getElementById('driRates');
  if (!rates) return;
  var opening = rates.hidden;
  rates.hidden = !opening;
  var empty = document.getElementById('driEmpty');
  if (empty) empty.hidden = opening;
  btn.classList.toggle('open', opening);
  btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
  btn.setAttribute('aria-label', opening ? 'Hide drilling rates' : 'View drilling rates');
  btn.title = opening ? 'Hide' : 'View';
});
;

/* ================= ui.js ================= */
/* ui.js — presentation glue only. script.js (calculation logic) is never modified. */

function calculateAndDisplay(){
  calculateTotal(); // defined in script.js, untouched
  revealResultPanels();
  syncExtraDisplayFields();
  trackQuoteComputed();
}

/* Fires once per calculation so the admin dashboard's "Total Quotes
   Computed" and "Pipeline Value" stats stay accurate. No-ops safely if
   tracking.js hasn't loaded (e.g. locally, offline). */
function trackQuoteComputed(){
  if (typeof window.smfdTrackQuote !== "function") return;
  const depth = document.getElementById("depth").value || 0;
  const total = parseCurrency(document.getElementById("grandTotal").innerText);
  window.smfdTrackQuote(depth, total);
}

function revealResultPanels(){
  document.getElementById("breakdownDetails").style.display = "block";
  document.getElementById("summaryDetails").style.display = "block";
}

function currency(n){
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function parseCurrency(text){
  return parseInt((text || "").replace(/[^0-9-]/g, "")) || 0;
}

function syncExtraDisplayFields(){
  const depth = document.getElementById("depth").value || 0;
  const drillingTotalText = document.getElementById("drillingTotal").innerText;
  const casing7Feet = document.getElementById("casing7").value || 0;
  const casing7Rate = document.getElementById("casing7Rate").value || 0;
  const casing10Feet = document.getElementById("casing10").value || 0;
  const casing10Rate = document.getElementById("casing10Rate").value || 0;
  const casing7TotalText = document.getElementById("casing7Total").innerText;
  const casing10TotalText = document.getElementById("casing10Total").innerText;
  const gstText = document.getElementById("gstAmount").innerText;
  const grandTotalText = document.getElementById("grandTotal").innerText;

  // stat card: combined PVC cost
  const pvcTotal = parseCurrency(casing7TotalText) + parseCurrency(casing10TotalText);
  document.getElementById("pvcTotalDisplay").innerText = currency(pvcTotal);

  // breakdown table footer
  document.getElementById("totalDepthFooter").innerText = depth + " ft";
  document.getElementById("totalDrillingCostFooter").innerText = drillingTotalText;

  // estimate summary panel
  document.getElementById("summaryDrilling").innerText = drillingTotalText;
  document.getElementById("summary7pvc").innerText = `${casing7Feet} ft @ ₹${casing7Rate}`;
  document.getElementById("summary7pvcAmt").innerText = casing7TotalText;
  document.getElementById("summary10pvc").innerText = `${casing10Feet} ft @ ₹${casing10Rate}`;
  document.getElementById("summary10pvcAmt").innerText = casing10TotalText;

  const subtotal = parseCurrency(drillingTotalText) + parseCurrency(casing7TotalText) + parseCurrency(casing10TotalText);
  document.getElementById("summarySubtotal").innerText = currency(subtotal);
  document.getElementById("summaryGST").innerText = gstText;
  document.getElementById("summaryTotal").innerText = grandTotalText;

  // keep accordions open right after a fresh calculation
  document.getElementById("breakdownDetails").open = true;
  document.getElementById("summaryDetails").open = true;
}

function applyResponsiveAccordionState(){
  const narrow = window.innerWidth <= 900;
  const breakdown = document.getElementById("breakdownDetails");
  const summary = document.getElementById("summaryDetails");
  if (breakdown.style.display !== "none"){
    breakdown.open = !narrow;
    summary.open = !narrow;
  }
}

function shareOnWhatsApp(){
  const total = document.getElementById("grandTotal").innerText;
  const depth = document.getElementById("depth").value || 0;
  const name = document.getElementById("customerName").value || "there";
  const msg = `Hi ${name}, here is your borewell drilling estimate:\n` +
              `Total Depth: ${depth} ft\n` +
              `Total Estimate: ${total}\n` +
              `— Nisite Webcraft Borewell Drilling Solutions`;
  window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
}

function downloadEstimateImage(){
  if (typeof html2canvas === "undefined"){
    window.print();
    return;
  }
  const target = document.querySelector(".page");
  html2canvas(target, { backgroundColor: "#080b14", scale: 2 }).then(canvas => {
    const link = document.createElement("a");
    link.download = "borewell-estimate.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("downloadBtn")?.addEventListener("click", downloadEstimateImage);
  document.getElementById("whatsappBtn")?.addEventListener("click", shareOnWhatsApp);
  window.addEventListener("resize", applyResponsiveAccordionState);
});
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

/* ================= pwa.js ================= */
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
;

/* ================= quotation-handoff.js ================= */
/* Quotation hand-off: passes the calculator's OWN slab breakdown + totals
   to quotation.html so the quotation never builds its own slab sequence. */
(function () {
  function num(t) {
    // Calculator prints "Rs.54,000", "₹90/ft", "₹1,23,456" - drop the
    // currency text first so the "." in "Rs." is not read as a decimal point.
    var s = String(t == null ? '' : t).replace(/Rs\.?/gi, '').replace(/₹/g, '').replace(/\/ft/gi, '');
    var n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  function txt(id) {
    var el = document.getElementById(id);
    return el ? el.textContent : '';
  }
  function hasEl(id) { return !!document.getElementById(id); }

  function saveCalcForQuotation() {
    // Make sure the breakdown on screen matches the current inputs.
    if (typeof window.calculateAndDisplay === 'function') {
      try { window.calculateAndDisplay(); } catch (e) {}
    }

    var rows = [];
    var body = document.getElementById('breakdown');
    if (body) {
      Array.prototype.forEach.call(body.children, function (row) {
        var cells = Array.prototype.map.call(row.children, function (c) {
          return c.textContent.trim();
        }).filter(function (t) { return t !== ''; });
        if (cells.length >= 3) {
          rows.push({ label: cells[0], rate: num(cells[1]), amount: num(cells[2]) });
        }
      });
    }

    var calc = {
      generatedAt: new Date().toISOString(),
      rows: rows,                                   // calculator's slab sequence
      drillingTotal: num(txt('totalDrillingCostFooter')),
      casing7Cost: hasEl('summary7pvcAmt') ? num(txt('summary7pvcAmt')) : null,
      casing10Cost: hasEl('summary10pvcAmt') ? num(txt('summary10pvcAmt')) : null,
      boreBata: hasEl('summaryBoreBata') ? num(txt('summaryBoreBata')) : null,
      transport: (window.PriceSettings ? window.PriceSettings.getCharges().transport : 0),
      otherCharges: (window.PriceSettings ? window.PriceSettings.getCharges().other : 0),
      slabPattern: (window.PriceSettings ? window.PriceSettings.patternLabel() : ''),
      subtotal: num(txt('summarySubtotal')),
      gstAmount: num(txt('summaryGST')),
      grandTotal: num(txt('summaryTotal'))
    };
    try { localStorage.setItem('quotationCalc', JSON.stringify(calc)); } catch (e) {}
  }

  var original = window.openQuotation;
  window.openQuotation = function () {
    if (typeof window.validateQuotation === 'function' && !window.validateQuotation()) return;
    saveCalcForQuotation();
    var result;
    if (typeof original === 'function') result = original.apply(this, arguments);
    // The original openQuotation() re-runs calculateTotal() only, which
    // drops bore bata from the on-page total - restore the full display.
    if (typeof window.calculateAndDisplay === 'function') {
      try { window.calculateAndDisplay(); } catch (e) {}
    }
    return result;
  };
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

/* ================= nav-progress.js ================= */
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
;
