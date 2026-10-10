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

    document.getElementById("gstToggle").checked = true;

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