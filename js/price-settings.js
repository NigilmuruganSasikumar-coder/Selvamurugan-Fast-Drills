/* Price Settings container: draft -> Save writes into the existing calculator inputs.
   Load AFTER script1.js. Does not modify the calculation code. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var box = $('priceSettingsContainer');
  if (!box) return;

  var KEY = 'smfd_price_settings_v1';
  var LIVE = { base: 'baseRate', rebore: 'reboreRate', p7: 'casing7Rate', p10: 'casing10Rate', bata: 'boreBata' };
  var FIRST_END = 300, SLAB_LEN = 100;
  var steps = [];      /* per-slab overrides: {step, custom} - slab 2 is steps[0] */
  var committed = null;

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
  function readStore() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function writeStore(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function depth() { return num(liveVal('depth')); }

  /* number of slabs needed to reach a depth (first slab always exists) */
  function slabCount(d) { return d > FIRST_END ? 1 + Math.ceil((d - FIRST_END) / SLAB_LEN) : 1; }

  function snapshot() {
    return {
      base: num($('psBase').value), rebore: num($('psRebore').value),
      p7: num($('ps7').value), p10: num($('ps10').value),
      bata: num($('psBata').value), bataOn: $('psBataOn').checked,
      transport: num($('psTransport').value), transportOn: $('psTransportOn').checked,
      other: num($('psOther').value), otherOn: $('psOtherOn').checked,
      stepRate: num($('psStepRate').value),
      steps: steps.map(function (x) { return { step: x.step, custom: !!x.custom }; })
    };
  }

  /* step added by slab k (k >= 2): override if edited by hand, else the global step rate */
  function stepOf(s, k) { var o = s.steps[k - 2]; return o && o.custom ? o.step : s.stepRate; }
  function rateOfSlab(s, k) { var r = s.base; for (var i = 2; i <= k; i++) r += stepOf(s, i); return r; }

  function slabList(s, d) {
    var n = slabCount(d), list = [];
    for (var k = 1; k <= n; k++) {
      var from = k === 1 ? 0 : FIRST_END + (k - 2) * SLAB_LEN;
      var to = k === 1 ? FIRST_END : from + SLAB_LEN;
      if (d > 0 && to > d) to = d;
      list.push({ n: k, from: from, to: to, step: k === 1 ? 0 : stepOf(s, k), rate: rateOfSlab(s, k) });
    }
    return list;
  }

  function api(s) {
    return {
      baseRate: s.base, reboreRate: s.rebore, pvc7Rate: s.p7, pvc10Rate: s.p10,
      boreBata: s.bataOn ? s.bata : 0,
      transportCharge: s.transportOn ? s.transport : 0,
      otherCharges: s.otherOn ? s.other : 0,
      slabs: slabList(s, depth()),
      rateForDepth: function (d) { return rateOfSlab(s, slabCount(d)); }
    };
  }

  function load() {
    var st = readStore();
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
    $('psStepRate').value = st.stepRate != null ? st.stepRate : 5;
    steps = (st.steps || []).map(function (x) { return { step: x.step, custom: !!x.custom }; });
    render();
  }

  /* ---- rendering: slabs always run up to the total depth ---- */
  function renderLeft() {
    var s = snapshot(), list = slabList(s, depth());
    var h = '<div class="ps-table-head"><span>Slab (ft)</span><span>Step rate</span></div>';
    list.forEach(function (sl) {
      var name = '<span class="ps-slab-name">' + pad(sl.from || 1) + ' - ' + sl.to + ' ft</span>';
      if (sl.n === 1) {
        h += '<div class="ps-table-row">' + name + '<div class="ps-step-cell"><span class="ps-base-tag">Base rate</span></div></div>';
      } else {
        h += '<div class="ps-table-row">' + name + '<div class="ps-step-cell"><label class="ps-mini"><span>+ ₹</span>' +
          '<input type="number" min="0" data-k="' + sl.n + '" value="' + sl.step + '" aria-label="Step rate for slab ' + sl.n + '"></label></div></div>';
      }
    });
    $('psSlabLeft').innerHTML = h;
  }

  function renderRight() {
    var s = snapshot(), list = slabList(s, depth());
    $('psChipBase').textContent = '₹' + inr(s.base);
    $('psChipRebore').textContent = '₹' + inr(s.rebore);
    var h = '<div class="ps-table-head"><span>Slab (ft)</span><span>Rate</span></div>';
    list.forEach(function (sl) {
      h += '<div class="ps-table-row"><span class="ps-slab-name">' + pad(sl.from || 1) + ' - ' + sl.to + ' ft</span>' +
        '<span class="ps-rate-cell"><b class="rs">₹</b>' + inr(sl.rate) + ' <small>/ ft</small></span></div>';
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
    if (t.matches('[data-k]')) {
      var k = +t.dataset.k;
      while (steps.length < k - 1) steps.push({ step: 0, custom: false });
      steps[k - 2] = { step: num(t.value), custom: true };
      renderRight(); return;
    }
    if (t.id === 'psStepRate') { render(); return; }   /* slabs not edited by hand follow the step rate */
    if (t.id === 'psBase' || t.id === 'psRebore') renderRight();
  });

  /* total depth changed in Project Details -> slabs grow/shrink to match */
  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'depth' && !box.hasAttribute('hidden')) render();
  });

  box.addEventListener('click', function (e) {
    if (e.target.closest('#psReset')) { load(); flash('Reset to last saved values'); return; }
    if (e.target.closest('#psClose')) { window.togglePriceSettings(false); return; }
    if (e.target.closest('#psSave')) {
      var s = snapshot();
      setLive(LIVE.base, s.base); setLive(LIVE.rebore, s.rebore);
      setLive(LIVE.p7, s.p7); setLive(LIVE.p10, s.p10);
      setLive(LIVE.bata, s.bataOn ? s.bata : 0);
      writeStore({ bata: s.bata, bataOn: s.bataOn, transport: s.transport, transportOn: s.transportOn,
        other: s.other, otherOn: s.otherOn, stepRate: s.stepRate, steps: s.steps });
      committed = api(s);
      window.priceSettings = committed;
      document.dispatchEvent(new CustomEvent('pricesettings:save', { detail: committed }));
      flash('Saved ✓');
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

  /* expose last saved settings for the calculation code */
  load();
  window.priceSettings = committed = api(snapshot());
})();