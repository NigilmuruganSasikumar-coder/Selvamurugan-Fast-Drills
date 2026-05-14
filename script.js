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



    let start = 1;

    let drillingTotal = 0;

    let breakdownHTML = "";



    // ORIGINAL LOGIC SETTINGS

    let currentRate = baseRate;

    let addValue = 5;


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
    // CORRECT RATE ADVANCEMENT
    // =========================

    currentRate = baseRate;

    addValue = 5;



    // FIRST 300 FT = BASE RATE

    if(reboreFeet >= 301){

        let tempDepth = 301;



        while(tempDepth <= reboreFeet + 100){

            currentRate += addValue;



            if(addValue === 5){

                addValue = 10;

            }

            else{

                addValue += 10;

            }



            tempDepth += 100;

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

            end = Math.min(start + 99, depth);

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



        // ORIGINAL NEW DRILLING LOGIC

        if(end < 1000){

            currentRate += addValue;

            if(addValue === 5){

                addValue = 10;

            }

            else{

                addValue += 10;

            }

        }

        else{

            currentRate += 100;

        }

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

    document.getElementById("depth").value = "";

    document.getElementById("baseRate").value = "90";

    document.getElementById("reboreFeet").value = "0";

    document.getElementById("reboreRate").value = "40";

    document.getElementById("casing7").value = "0";

    document.getElementById("casing7Rate").value = "450";

    document.getElementById("casing10").value = "0";

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



function saveImage(){

    const header =
    document.getElementById("quoteHeader");

    header.style.display = "block";



    // SHOW TERMS

    document.querySelector(".terms-box")
    .style.display = "block";



    // HIDE WEBSITE ELEMENTS

    document.querySelector(".title")
    .style.display = "none";

    document.querySelector(".type-flex")
    .style.display = "none";

    document.querySelector(".grid")
    .style.display = "none";

    document.querySelector(".gst-box")
    .style.display = "none";

    document.querySelector(".button-flex")
    .style.display = "none";

    document.querySelector(".quote-actions")
    .style.display = "none";



    const quote =
    document.getElementById("quoteArea");



    html2canvas(quote,{

        scale:2,

        useCORS:true,

        scrollY:-window.scrollY

    }).then(canvas => {

        const link =
        document.createElement("a");

        link.download =
        "Selvamurugan-FastDrills-Quotation.png";

        link.href =
        canvas.toDataURL("image/png");

        link.click();



        // RESTORE WEBSITE

        header.style.display = "none";

        document.querySelector(".terms-box")
        .style.display = "none";

        document.querySelector(".title")
        .style.display = "block";

        document.querySelector(".type-flex")
        .style.display = "flex";

        document.querySelector(".grid")
        .style.display = "grid";

        document.querySelector(".gst-box")
        .style.display = "flex";

        document.querySelector(".button-flex")
        .style.display = "flex";

        document.querySelector(".quote-actions")
        .style.display = "flex";

        document.querySelector(".result-box")
        .style.display = "flex";

    });

}






function shareWhatsApp(){

    const header =
    document.getElementById("quoteHeader");

    header.style.display = "block";



    // SHOW TERMS

    document.querySelector(".terms-box")
    .style.display = "block";



    // HIDE WEBSITE ELEMENTS

    document.querySelector(".title")
    .style.display = "none";

    document.querySelector(".type-flex")
    .style.display = "none";

    document.querySelector(".grid")
    .style.display = "none";

    document.querySelector(".gst-box")
    .style.display = "none";

    document.querySelector(".button-flex")
    .style.display = "none";

    document.querySelector(".quote-actions")
    .style.display = "none";



    const quote =
    document.getElementById("quoteArea");



    html2canvas(quote,{

        scale:2,

        useCORS:true,

        scrollY:-window.scrollY

    }).then(canvas => {

        canvas.toBlob(function(blob){

            const file =
            new File(
                [blob],
                "Quotation.png",
                {
                    type:"image/png"
                }
            );



            if(
                navigator.canShare &&
                navigator.canShare({
                    files:[file]
                })
            ){

                navigator.share({

                    files:[file],

                    title:
                    "Borewell Quotation",

                    text:
                    "Selvamurugan Fast Drills"

                });

            }

            else{

                alert(
                "WhatsApp sharing works mainly on mobile devices."
                );

            }



            // RESTORE WEBSITE

            header.style.display = "none";

            document.querySelector(".terms-box")
            .style.display = "none";

            document.querySelector(".title")
            .style.display = "block";

            document.querySelector(".type-flex")
            .style.display = "flex";

            document.querySelector(".grid")
            .style.display = "grid";

            document.querySelector(".gst-box")
            .style.display = "flex";

            document.querySelector(".button-flex")
            .style.display = "flex";

            document.querySelector(".quote-actions")
            .style.display = "flex";

            document.querySelector(".result-box")
            .style.display = "flex";

        });

    });

}