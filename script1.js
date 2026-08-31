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