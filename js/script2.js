/* ==========================================================================
   script2.js — CALCULATOR (borewell cost logic + bore-type rate/bata)
   ========================================================================== */

let drillingMode = "new";

// ==========================================================================
// SLAB RATE SEQUENCE
// SEQUENCE B (1st screenshot), base 98: 98,108,118,138,168,208,258,358 then +100
// Step added to the rate AFTER each slab, in order:
//   after 001-300 -> 301-400, after 301-400 -> 401-500, ...
// Once the list runs out, the step is 100 per slab.
// ==========================================================================
const SLAB_STEPS = [10, 10, 20, 30, 40, 50, 100];

function getStep(i){

    return (i < SLAB_STEPS.length) ? SLAB_STEPS[i] : 100;

}

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



    let start = 1;

    let drillingTotal = 0;

    let breakdownHTML = "";



    // ORIGINAL LOGIC SETTINGS

    let currentRate = baseRate;

    let stepIndex = 0;


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



    // NEXT STARTING POINT

    start = reboreFeet + 1;


// =========================
// REBORE RATE ADVANCEMENT (RULE B)
// =========================

currentRate = baseRate;
stepIndex = 0;

if (reboreFeet > 300) {

    // Determine the slab where the rebore ENDS
    let slab = Math.floor((reboreFeet - 1) / 100);

    // Example:
    // 301-400 -> slab = 3
    // 401-500 -> slab = 4
    // 501-600 -> slab = 5

    for (let s = 3; s <= slab; s++) {

        currentRate += getStep(stepIndex);

        stepIndex++;
    }

}
}

    // =========================
    // NORMAL SLAB CALCULATION
    // =========================

    while(start <= depth){

        let end;


    if(start <= 300){

        end = Math.min(300, depth);

    }
    else{

        // Keep slab boundaries fixed at 400,500,600,700...
        end = Math.min(Math.ceil(start / 100) * 100, depth);

    }



        let feet =
        end - start + 1;



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



        // SLAB RATE ESCALATION (from SLAB_STEPS)

        currentRate += getStep(stepIndex);

        stepIndex++;

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

  if (!boreBataInput || !summarySubtotalEl) return;

  var boreBata    = parseFloat(boreBataInput.value) || 0;
  var boreTypeVal = boreTypeSel ? boreTypeSel.value : '';
  var boreLabel   = boreTypeVal ? boreTypeVal + '″ Bore' : '–';

  // Update bore bata summary line
  if (summaryBoreBataEl)  summaryBoreBataEl.textContent  = '₹' + fmt(boreBata);
  if (summaryBoreTypeEl)  summaryBoreTypeEl.textContent  = boreLabel;
  if (boreBataLine) boreBataLine.style.display = boreBata > 0 ? '' : 'none';

  // Read what script.js already computed for subtotal, GST, total
  var rawSubtotal = parseRs(summarySubtotalEl.textContent);
  var gstChecked  = document.getElementById('gstToggle') ? document.getElementById('gstToggle').checked : false;

  // New subtotal = old subtotal + bore bata
  var newSubtotal = rawSubtotal + boreBata;
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