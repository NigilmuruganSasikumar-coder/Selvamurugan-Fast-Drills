/* CALCULATOR FUNCTIONS - price settings, calculation, results, quotation hand-off */

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
