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