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

  function load() {
    var st = readStore(), cfg = normCfg(st);
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
    if (e.target && e.target.id === 'stepRate' && !box.hasAttribute('hidden')) render();
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