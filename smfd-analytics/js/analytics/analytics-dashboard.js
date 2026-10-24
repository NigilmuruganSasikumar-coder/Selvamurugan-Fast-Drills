/* ==========================================================================
   SMFD Live Visitor Analytics — admin dashboard (ES module)
   Usage:  import { initAnalyticsDashboard } from "./js/analytics/analytics-dashboard.js";
           initAnalyticsDashboard();      // wires every [data-open-analytics] button
           // or: const d = initAnalyticsDashboard(); d.open();

   - Signs in with Firebase Email/Password; access is enforced by firestore.rules (admins/{uid}).
     The check in this file only chooses which screen to show; it is not the security boundary.
   - ONE sessions listener while the dashboard is open; ONE events listener only while the
     Live Stream tab is visible. Aggregates are read with getDocs (≤ 90 small docs per refresh).
   ========================================================================== */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, query, where, orderBy, limit, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { FIREBASE_CONFIG, ANALYTICS } from "./analytics-config.js";
import {
  istDay, addDays, roundPercents, fmtDuration, timeAgo, escapeHtml as esc, fmtNum
} from "./analytics-utils.js";

const PALETTE = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EC4899", "#2DD4BF", "#64748B"];
const SECTION_LABEL = { landing: "Home / Landing", ai_assistant: "AI Assistant", service_areas: "Service Areas",
  calculator: "Cost Calculator", testimonials: "Customer Reviews", faq: "FAQ", gallery: "Project Gallery" };
const EVENT_LABEL = { page_view: "Viewed a page", session_start: "New visit started", cta_click: "Tapped a button",
  phone_click: "Tapped Call", whatsapp_click: "Tapped WhatsApp", calculator_open: "Started using the cost calculator",
  calculator_complete: "Opened an estimate in the quotation", quotation_start: "Viewed the quotation",
  quotation_submit: "Saved / shared the quotation", contact_submit: "Sent the enquiry form (WhatsApp opened)" };
const DEVICE_LABEL = { mobile: "Mobile", desktop: "Desktop / Laptop", tablet: "Tablet", unknown: "Unknown" };
const OS_LABEL = { android: "Android", ios: "iOS / iPadOS", windows: "Windows", macos: "macOS", linux: "Linux", other: "Other / Unknown" };
const BR_LABEL = { chrome: "Chrome", safari: "Safari", edge: "Edge", firefox: "Firefox", other: "Other / Unknown" };

export function initAnalyticsDashboard(opts = {}) {
  const app = getApps().find(a => a.name === "smfd-analytics-admin") || initializeApp(FIREBASE_CONFIG, "smfd-analytics-admin");
  const auth = getAuth(app), db = getFirestore(app);

  const S = {                       // all mutable state lives here
    open: false, tab: "geo", range: "7d", from: "", to: "", user: null, gate: "login",
    daily: null, totals: null, geoDocs: [], sessions: [], events: [],
    loading: false, error: "", updated: null, online: navigator.onLine, liveOk: true,
    unsubAuth: null, unsubSessions: null, unsubEvents: null, tickTimer: null, pollTimer: null, opener: null
  };
  let root;

  /* -------------------------------------------------------------- markup */
  function build() {
    root = document.createElement("div");
    root.className = "ava-overlay"; root.hidden = true;
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-labelledby", "avaTitle");
    root.innerHTML = `
      <div class="ava-panel">
        <header class="ava-head">
          <div class="ava-logo" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/></svg></div>
          <div class="ava-titles"><h2 id="avaTitle">Live Visitor Analytics</h2><p>Real-Time Traffic, Location &amp; Hardware Insights</p></div>
          <button class="ava-close" type="button" aria-label="Close analytics"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        </header>
        <nav class="ava-tabs" role="tablist" aria-label="Analytics sections">
          <button role="tab" id="avaT-geo" data-tab="geo" aria-selected="true" aria-controls="avaP-geo">📍 Geography</button>
          <button role="tab" id="avaT-dev" data-tab="dev" aria-selected="false" aria-controls="avaP-dev" tabindex="-1">📱 Devices &amp; OS</button>
          <button role="tab" id="avaT-eng" data-tab="eng" aria-selected="false" aria-controls="avaP-eng" tabindex="-1">⏱️ Engagement</button>
          <button role="tab" id="avaT-live" data-tab="live" aria-selected="false" aria-controls="avaP-live" tabindex="-1">⚡ Live Stream</button>
        </nav>
        <div class="ava-body" id="avaBody" tabindex="-1"></div>
        <footer class="ava-foot">
          <span class="ava-status" id="avaStatus" role="status" aria-live="polite"></span>
          <button type="button" class="ava-btn ava-btn-ghost" id="avaRefresh">↻ Refresh Live Data</button>
          <button type="button" class="ava-btn ava-btn-primary" id="avaDone">Done</button>
        </footer>
      </div>`;
    document.body.appendChild(root);

    root.addEventListener("click", e => {
      if (e.target === root) close();
      const t = e.target.closest("[data-tab]"); if (t) switchTab(t.dataset.tab);
    });
    root.querySelector(".ava-close").onclick = close;
    root.querySelector("#avaDone").onclick = close;
    root.querySelector("#avaRefresh").onclick = () => refresh(true);
    root.addEventListener("keydown", onKey);
    root.querySelector(".ava-body").addEventListener("change", onControl);
    root.querySelector(".ava-body").addEventListener("submit", onSubmit);
    root.querySelector(".ava-body").addEventListener("click", e => {
      if (e.target.closest("[data-retry]")) refresh(true);
      if (e.target.closest("[data-signout]")) signOut(auth);
    });
  }

  function onKey(e) {
    if (e.key === "Escape") return close();
    const tab = e.target.closest && e.target.closest("[role=tab]");
    if (tab && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      const tabs = [...root.querySelectorAll("[role=tab]")], i = tabs.indexOf(tab);
      const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      n.focus(); switchTab(n.dataset.tab);
    }
    if (e.key === "Tab") {                                  // keep focus inside the dialog
      const f = [...root.querySelectorAll("button:not([disabled]),input,select,[tabindex='0']")].filter(x => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  /* --------------------------------------------------------- open / close */
  function open() {
    if (S.open) return;
    if (!root) build();
    S.open = true; S.opener = document.activeElement;
    root.hidden = false;
    document.documentElement.classList.add("ava-lock");
    S.unsubAuth = onAuthStateChanged(auth, onAuth);
    addEventListener("online", onNet); addEventListener("offline", onNet);
    renderAll();
    root.querySelector(".ava-close").focus();
  }

  function close() {
    if (!S.open) return;
    S.open = false; root.hidden = true;
    document.documentElement.classList.remove("ava-lock");
    stopLive();
    if (S.unsubAuth) { S.unsubAuth(); S.unsubAuth = null; }
    removeEventListener("online", onNet); removeEventListener("offline", onNet);
    if (S.opener && S.opener.focus) S.opener.focus();
  }

  function onNet() { S.online = navigator.onLine; renderStatus(); if (S.online && S.gate === "ok") refresh(false); }

  /* ---------------------------------------------------------------- auth */
  async function onAuth(user) {
    stopLive();
    if (!user || user.isAnonymous) { S.user = null; S.gate = "login"; return renderAll(); }
    S.user = user; S.gate = "checking"; renderAll();
    try {
      const snap = await getDoc(doc(db, "admins", user.uid));       // rules only allow reading your own admins doc
      if (!snap.exists()) { S.gate = "denied"; S.denyWhy = "missing"; return renderAll(); }
    } catch (e) { S.gate = "denied"; S.denyWhy = e && e.code || "error"; return renderAll(); }
    S.gate = "ok"; renderAll();
    startLive();
  }

  async function onSubmit(e) {
    if (!e.target.matches("#avaLogin")) return;
    e.preventDefault();
    const f = e.target, btn = f.querySelector("button[type=submit]"), msg = f.querySelector(".ava-form-msg");
    btn.disabled = true; msg.textContent = "";
    try { await signInWithEmailAndPassword(auth, f.email.value.trim(), f.password.value); }
    catch (err) { msg.textContent = "Sign-in failed. Check your email and password."; btn.disabled = false; }
  }

  /* ---------------------------------------------------------- live + data */
  function startLive() {
    stopLive();
    S.liveOk = true;
    S.unsubSessions = onSnapshot(
      query(collection(db, "analyticsSessions"), orderBy("lastSeen", "desc"), limit(100)),
      snap => { S.sessions = snap.docs.map(d => ({ id: d.id, ...d.data() })); S.liveOk = true; renderLive(); renderStatus(); },
      err => { S.liveOk = false; S.error = errText(err); renderStatus(); renderBody(); }
    );
    S.tickTimer = setInterval(() => { renderLive(); }, 5000);            // re-evaluates the 90 s window locally (no reads)
    S.pollTimer = setInterval(() => { if (document.visibilityState === "visible") refresh(false); }, 60000);
    if (S.tab === "live") attachEvents();
    refresh(true);
  }

  function stopLive() {
    ["unsubSessions", "unsubEvents"].forEach(k => { if (S[k]) { S[k](); S[k] = null; } });
    clearInterval(S.tickTimer); clearInterval(S.pollTimer); S.tickTimer = S.pollTimer = null;
  }

  function attachEvents() {
    if (S.unsubEvents) return;
    S.unsubEvents = onSnapshot(
      query(collection(db, "analyticsEvents"), orderBy("ts", "desc"), limit(25)),
      snap => { S.events = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderLive(); },
      err => { S.error = errText(err); renderBody(); }
    );
  }
  function detachEvents() { if (S.unsubEvents) { S.unsubEvents(); S.unsubEvents = null; } }

  function currentRange() {
    const today = istDay();
    if (S.range === "today") return [today, today];
    if (S.range === "7d") return [addDays(today, -6), today];
    if (S.range === "30d") return [addDays(today, -29), today];
    let from = S.from || addDays(today, -6), to = S.to || today;
    if (from > to) [from, to] = [to, from];
    if (from < addDays(to, -89)) from = addDays(to, -89);                // hard cap: 90 days
    return [from, to];
  }

  async function refresh(showSkeleton) {
    if (S.gate !== "ok") return;
    S.loading = showSkeleton || !S.daily; S.error = ""; if (S.loading) renderBody();
    const [from, to] = currentRange();
    try {
      const [dailySnap, geoSnap, totalsSnap] = await Promise.all([
        getDocs(query(collection(db, "analyticsDaily"), where("day", ">=", from), where("day", "<=", to))),
        getDocs(query(collection(db, "analyticsGeo"), where("day", ">=", from), where("day", "<=", to), limit(3000))),
        getDoc(doc(db, "analyticsTotals", "all"))
      ]);
      S.daily = sumDaily(dailySnap.docs.map(d => d.data()));
      S.geoDocs = geoSnap.docs.map(d => d.data());
      S.totals = totalsSnap.exists() ? totalsSnap.data() : { pv: 0, sessions: 0 };
      S.updated = new Date(); S.loading = false; S.error = "";
    } catch (err) { S.loading = false; S.error = errText(err); }
    renderBody(); renderStatus();
  }

  function sumDaily(docs) {
    const t = {};
    docs.forEach(d => Object.keys(d).forEach(k => { if (typeof d[k] === "number") t[k] = (t[k] || 0) + d[k]; }));
    return t;
  }
  const n = k => (S.daily && S.daily[k]) || 0;
  function errText(err) {
    if (err && err.code === "permission-denied") return "Permission denied. Make sure firestore.rules are deployed and your account has an admins/{uid} document.";
    if (err && err.code === "unavailable") return "Firestore is unreachable. Check your connection — retrying automatically.";
    return "Could not load analytics (" + ((err && (err.code || err.message)) || "unknown error") + ").";
  }

  /* ------------------------------------------------------------ controls */
  function switchTab(tab) {
    S.tab = tab;
    root.querySelectorAll("[role=tab]").forEach(b => {
      const on = b.dataset.tab === tab; b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1;
    });
    root.querySelectorAll(".ava-panel-tab").forEach(p => { p.hidden = p.dataset.panel !== tab; });
    if (tab === "live" && S.gate === "ok") attachEvents(); else detachEvents();
    root.querySelector("#avaBody").scrollTop = 0;
  }

  function onControl(e) {
    if (e.target.id === "avaRange") {
      S.range = e.target.value; renderBody(); if (S.range !== "custom") refresh(true);
    } else if (e.target.id === "avaFrom" || e.target.id === "avaTo") {
      S.from = root.querySelector("#avaFrom").value; S.to = root.querySelector("#avaTo").value; refresh(true);
    }
  }

  /* ------------------------------------------------------------- render */
  function renderAll() { renderBody(); renderStatus(); switchTab(S.tab); }

  function renderStatus() {
    const el = root && root.querySelector("#avaStatus"); if (!el) return;
    let cls = "ok", txt = S.updated ? "Updated " + S.updated.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "Waiting for data";
    if (!S.online) { cls = "off"; txt = "Offline — showing last data"; }
    else if (!S.liveOk && S.gate === "ok") { cls = "warn"; txt = "Reconnecting…"; }
    el.className = "ava-status ava-" + cls; el.innerHTML = `<i></i>${esc(txt)}`;
    root.querySelector("#avaRefresh").disabled = S.gate !== "ok";
  }

  function renderBody() {
    const body = root.querySelector("#avaBody");
    if (S.gate !== "ok") { body.innerHTML = gateHtml(); return; }
    const scroll = body.scrollTop;
    const [from, to] = currentRange();
    body.innerHTML = `
      <div class="ava-toolbar">
        <label class="ava-sr" for="avaRange">Date range</label>
        <select id="avaRange" class="ava-input">
          ${[["today", "Today"], ["7d", "Last 7 days"], ["30d", "Last 30 days"], ["custom", "Custom range"]]
            .map(([v, l]) => `<option value="${v}" ${S.range === v ? "selected" : ""}>${l}</option>`).join("")}
        </select>
        ${S.range === "custom" ? `<input id="avaFrom" class="ava-input" type="date" aria-label="From date" value="${from}" max="${to}"><input id="avaTo" class="ava-input" type="date" aria-label="To date" value="${to}" max="${istDay()}">` : ""}
        <span class="ava-hint">${from === to ? from : from + " → " + to} · India Standard Time</span>
        <button class="ava-link" data-signout type="button">Sign out</button>
      </div>
      ${S.error ? `<div class="ava-alert" role="alert"><span>${esc(S.error)}</span><button class="ava-btn ava-btn-ghost" data-retry type="button">Retry</button></div>` : ""}
      ${S.loading ? skeleton() : `
      <section class="ava-cards" aria-label="Overview">
        <article class="ava-card ava-stat"><h3>Cumulative Page Views</h3>
          <p class="ava-big" id="avaPV">${fmtNum(S.totals ? S.totals.pv : 0)}</p>
          <p class="ava-sub">All time since tracking began · ${fmtNum(n("pv"))} in selected range</p></article>
        <article class="ava-card ava-stat ava-stat-live"><h3>Live Active Users</h3>
          <p class="ava-big"><span id="avaLive">0</span><span class="ava-pulse" aria-hidden="true"></span></p>
          <p class="ava-sub" id="avaLiveSub">Distinct sessions with a heartbeat in the last ${ANALYTICS.ACTIVE_WINDOW_MS / 1000}s</p></article>
      </section>
      <div class="ava-panel-tab" data-panel="geo" id="avaP-geo" role="tabpanel" aria-labelledby="avaT-geo">${geoHtml()}</div>
      <div class="ava-panel-tab" data-panel="dev" id="avaP-dev" role="tabpanel" aria-labelledby="avaT-dev">${devHtml()}</div>
      <div class="ava-panel-tab" data-panel="eng" id="avaP-eng" role="tabpanel" aria-labelledby="avaT-eng">${engHtml()}</div>
      <div class="ava-panel-tab" data-panel="live" id="avaP-live" role="tabpanel" aria-labelledby="avaT-live"><div id="avaStream"></div></div>
      <p class="ava-privacy">Privacy: visitors are counted anonymously. No names, phone numbers, form text, chat messages or IP addresses are stored. Location is network-based and approximate. Device and browser are best-effort guesses from the user-agent. Call, WhatsApp and form events are taps/intent — they do not prove a call connected or a message was delivered.</p>`}`;
    root.querySelectorAll(".ava-panel-tab").forEach(p => { p.hidden = p.dataset.panel !== S.tab; });
    body.scrollTop = scroll;
    renderLive();
    if (!S.loading) showMyLocation();
  }

  function gateHtml() {
    if (S.gate === "checking") return `<div class="ava-empty"><div class="ava-spinner"></div><p>Verifying access…</p></div>`;
    if (S.gate === "denied") return `<div class="ava-empty"><h3>Not authorised</h3><p>${esc(S.user && S.user.email || "This account")} is not on the administrator list.</p>
      <p class="ava-note">${S.denyWhy === "permission-denied" ? "Firestore refused the lookup. Publish firestore.rules in Firebase → Firestore → Rules, then sign in again." : "No document found in the <b>admins</b> collection whose Document ID is exactly this UID:"}</p>
      <p class="ava-note"><code style="user-select:all;word-break:break-all;color:#fff">${esc(S.user && S.user.uid || "")}</code></p><button class="ava-btn ava-btn-ghost" data-signout type="button">Sign out</button></div>`;
    return `<form class="ava-login" id="avaLogin" autocomplete="on">
      <h3>Administrator sign-in</h3><p class="ava-sub">Analytics are private. Sign in with your admin account.</p>
      <label>Email<input class="ava-input" name="email" type="email" autocomplete="username" required></label>
      <label>Password<input class="ava-input" name="password" type="password" autocomplete="current-password" required></label>
      <p class="ava-form-msg" role="alert"></p>
      <button class="ava-btn ava-btn-primary" type="submit">Sign in</button></form>`;
  }

  const skeleton = () => `<div class="ava-cards"><div class="ava-card ava-skel"></div><div class="ava-card ava-skel"></div></div>
    <div class="ava-card ava-skel ava-skel-tall"></div><div class="ava-card ava-skel ava-skel-tall"></div>`;

  function rows(items, total, denomLabel) {
    // items: [{name,count}] already sorted; percentages use largest-remainder so they add to 100
    const pcts = roundPercents(items.map(i => i.count));
    return `<ul class="ava-rows">${items.map((it, i) => `
      <li class="ava-row" style="--c:${PALETTE[i % PALETTE.length]}">
        <div class="ava-row-top"><span class="ava-name">${esc(it.name)}</span><span class="ava-val">${fmtNum(it.count)} <b>${pcts[i]}%</b></span></div>
        <div class="ava-bar" role="img" aria-label="${esc(it.name)} ${pcts[i]} percent"><i style="width:${it.count ? Math.max(pcts[i], 2) : 0}%"></i></div>
      </li>`).join("")}</ul>${denomLabel ? `<p class="ava-note">${esc(denomLabel)}</p>` : ""}`;
  }

  function geoGroups(kind) {
    const m = new Map();
    S.geoDocs.filter(d => d.kind === kind).forEach(d => m.set(d.name, (m.get(d.name) || 0) + d.count));
    const unknown = m.get("Unknown") || 0; m.delete("Unknown");
    const list = [...m].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    const known = list.reduce((a, b) => a + b.count, 0);
    return { list, unknown, known, total: known + unknown };
  }

  function geoHtml() {
    const city = geoGroups("city"), st = geoGroups("state");
    const enough = city.known >= ANALYTICS.MIN_GEO_SESSIONS;
    const block = (title, g, unit) => `<article class="ava-card"><h3>${title}</h3>${
      !g.total ? `<p class="ava-empty-line">No sessions recorded in this range.</p>`
      : !enough ? `<p class="ava-empty-line">Not enough location data yet (${g.known} of ${ANALYTICS.MIN_GEO_SESSIONS} located sessions). Rankings appear once there is enough to be meaningful.</p>`
      : rows([...g.list.slice(0, 10), ...(g.unknown ? [{ name: "Unknown", count: g.unknown }] : [])], g.total,
             `Counted by sessions (one per visit). Percent of all ${fmtNum(g.total)} sessions in range, including Unknown.`)}</article>`;
    const top = st.list[0];
    return `
      <article class="ava-card"><h3>📌 Detected location</h3><p class="ava-sub" id="avaMyLoc">Checking…</p>
        <p class="ava-note">Approximate, network-based. This is not GPS and may be wrong on mobile data or VPNs.</p></article>
      ${block("District / city-wise distribution", city)}
      ${block("State-wise distribution", st)}
      <article class="ava-card"><h3>Geographic summary</h3><dl class="ava-dl">
        <div><dt>Sessions with location</dt><dd>${fmtNum(city.known)}</dd></div>
        <div><dt>Unknown / unavailable</dt><dd>${fmtNum(city.unknown)}</dd></div>
        <div><dt>Most visited recorded region</dt><dd>${top && enough ? esc(top.name) : "—"}</dd></div></dl></article>`;
  }

  function group(prefix, labels) {
    return Object.keys(labels).map(k => ({ name: labels[k], count: n(prefix + k) }))
      .sort((a, b) => b.count - a.count);
  }
  function devHtml() {
    const mk = (title, prefix, labels) => {
      const items = group(prefix, labels), total = items.reduce((a, b) => a + b.count, 0);
      return `<article class="ava-card"><h3>${title}</h3>${total ? rows(items, total, `Denominator: ${fmtNum(total)} classified sessions in range (one count per visit, not per page view).`) : `<p class="ava-empty-line">No sessions recorded in this range.</p>`}</article>`;
    };
    return mk("Device form factor", "dev_", DEVICE_LABEL) + mk("Operating systems", "os_", OS_LABEL) + mk("Web browsers", "br_", BR_LABEL) +
      `<p class="ava-note">Best-effort classification from the user-agent. OS and browser are independent: an iPhone can run Chrome, an Android phone Firefox.</p>`;
  }

  function engHtml() {
    const feats = [
      ["🧮 Instant Cost Calculator", n("ev_calculator_open"), "uses"],
      ["📄 Estimates opened as quotation", n("ev_calculator_complete"), "opens"],
      ["📑 Quotation page views", n("ev_quotation_start"), "views"],
      ["💾 Quotation saved / shared (taps)", n("ev_quotation_submit"), "taps"],
      ["📞 Call taps", n("ev_phone_click"), "taps"],
      ["💬 WhatsApp taps", n("ev_whatsapp_click"), "taps"],
      ["📝 Enquiry form sends (WhatsApp opened)", n("ev_contact_submit"), "sends"],
      ["🤖 AI assistant opened", n("cta_ai_chat_open"), "opens"],
      ["🤖 AI assistant messages", n("cta_ai_chat_message"), "messages"],
      ["⭐ Customer Reviews section viewed", n("sec_testimonials"), "views"],
      ["🖼️ Project Gallery viewed", n("sec_gallery"), "views"],
      ["❓ FAQ viewed", n("sec_faq"), "views"],
      ["🗺️ Service Areas viewed", n("sec_service_areas"), "views"]
    ].sort((a, b) => b[1] - a[1]);
    const maxV = feats[0][1], sessions = n("sessions");
    const hours = Array.from({ length: 24 }, (_, h) => n("eh_" + String(h).padStart(2, "0")));
    const hMax = Math.max(...hours), peak = hMax ? hours.indexOf(hMax) : -1;
    const hl = h => `${String(h).padStart(2, "0")}:00–${String((h + 1) % 24).padStart(2, "0")}:00`;
    return `
      <article class="ava-card"><h3>Top Section Interactions</h3>${maxV ? `<ul class="ava-rows">${feats.map(([name, c, unit], i) => `
        <li class="ava-row" style="--c:${PALETTE[i % PALETTE.length]}"><div class="ava-row-top"><span class="ava-name">${esc(name)}</span><span class="ava-val">${fmtNum(c)} <small>${unit}</small></span></div>
        <div class="ava-bar"><i style="width:${c ? Math.max(Math.round((c / maxV) * 100), 2) : 0}%"></i></div></li>`).join("")}</ul>
        <p class="ava-note">Bars are relative to the most-used feature. “Taps” are button/link taps — they do not prove a call connected or a message was sent.</p>` : `<p class="ava-empty-line">No interactions recorded in this range yet.</p>`}</article>
      <section class="ava-grid2">
        <article class="ava-card ava-mini"><h3>Avg engaged time / session</h3><p class="ava-big-sm">${sessions ? fmtDuration(n("engagedMs") / sessions) : "—"}</p><p class="ava-note">Visible tab + user activity in last 30 s ÷ sessions</p></article>
        <article class="ava-card ava-mini"><h3>Page views / session</h3><p class="ava-big-sm">${sessions ? (n("pv") / sessions).toFixed(2) : "—"}</p><p class="ava-note">${fmtNum(n("pv"))} views ÷ ${fmtNum(sessions)} sessions</p></article>
        <article class="ava-card ava-mini"><h3>Tracked interactions</h3><p class="ava-big-sm">${fmtNum(n("interactions"))}</p><p class="ava-note">Taps & feature uses (excludes section views)</p></article>
        <article class="ava-card ava-mini"><h3>Sessions with an interaction</h3><p class="ava-big-sm">${fmtNum(n("interSessions"))}${sessions ? ` <small>${Math.round(n("interSessions") / sessions * 100)}%</small>` : ""}</p><p class="ava-note">of ${fmtNum(sessions)} sessions</p></article>
      </section>
      <article class="ava-card ava-mini"><h3>Most-used feature</h3><p class="ava-big-sm">${maxV ? esc(feats[0][0]) : "—"}</p></article>
      <article class="ava-card"><h3>Peak enquiry-intent hours (IST)</h3>${hMax ? `
        <div class="ava-hours" role="img" aria-label="Enquiry intents by hour. Peak ${hl(peak)}">${hours.map((c, h) => `<div class="ava-hcol${h === peak ? " is-peak" : ""}" title="${hl(h)}: ${c}"><i style="height:${c ? Math.max(Math.round(c / hMax * 100), 4) : 0}%"></i><span>${h % 3 === 0 ? String(h).padStart(2, "0") : ""}</span></div>`).join("")}</div>
        <p class="ava-note">Peak: <b>${hl(peak)}</b> (${hMax}). Counts call taps, WhatsApp taps and validated enquiry-form sends — intent, not confirmed enquiries.</p>` : `<p class="ava-empty-line">No enquiry activity recorded in this range yet.</p>`}</article>`;
  }

  /* Live card + stream: re-rendered from memory only (no reads) */
  function renderLive() {
    if (!root || S.gate !== "ok") return;
    const now = Date.now(), win = ANALYTICS.ACTIVE_WINDOW_MS;
    const ms = s => (s.lastSeen && s.lastSeen.toMillis ? s.lastSeen.toMillis() : 0);
    const active = S.sessions.filter(s => now - ms(s) <= win);
    const liveEl = root.querySelector("#avaLive");
    if (liveEl && liveEl.textContent !== String(active.length)) { liveEl.textContent = active.length; liveEl.classList.remove("ava-flash"); void liveEl.offsetWidth; liveEl.classList.add("ava-flash"); }

    const stream = root.querySelector("#avaStream"); if (!stream) return;
    const recent = S.sessions.filter(s => now - ms(s) <= 6 * 3600000).slice(0, 30);
    const evs = S.events.filter(e => e.type !== "session_start");
    stream.innerHTML = `
      <article class="ava-card"><h3>Real-Time Visitor Activity Stream</h3>
        ${recent.length ? `<ul class="ava-feed">${recent.map(s => {
          const age = now - ms(s), state = age <= win ? ["on", "Active now"] : age <= 600000 ? ["recent", "Active recently"] : ["off", "Inactive"];
          const where = s.section ? (SECTION_LABEL[s.section] || s.section.replace(/_/g, " ")) : (s.page === "/" || /index/.test(s.page) ? "Home" : s.page);
          const city = s.city && s.city !== "Unknown" ? s.city : "Unknown location";
          return `<li class="ava-item"><span class="ava-dot ava-dot-${state[0]}" aria-hidden="true"></span><div>
            <p class="ava-item-t">Visitor from ${esc(city)} • ${esc(where)}</p>
            <p class="ava-item-s">${esc(DEVICE_LABEL[s.device] || "Unknown")} / ${esc(OS_LABEL[s.os] || "Other")} · ${esc(BR_LABEL[s.browser] || "Other")} · #${esc(String(s.id).slice(-6))}</p>
            <p class="ava-item-s ava-${state[0]}-txt">${state[1]} · ${timeAgo(ms(s))}</p></div></li>`; }).join("")}</ul>`
        : `<div class="ava-empty"><p><b>No visitor activity yet.</b></p><p>Live visitors will appear here as real people use the website. Nothing is simulated.</p></div>`}</article>
      <article class="ava-card"><h3>Recent interactions</h3>${evs.length ? `<ul class="ava-feed">${evs.slice(0, 15).map(e => `
        <li class="ava-item"><span class="ava-dot ava-dot-recent" aria-hidden="true"></span><div>
        <p class="ava-item-t">${esc(EVENT_LABEL[e.type] || e.type)}</p>
        <p class="ava-item-s">${esc(e.city && e.city !== "Unknown" ? e.city : "Unknown location")} · ${esc(DEVICE_LABEL[e.device] || "Unknown")} · ${e.ts && e.ts.toMillis ? timeAgo(e.ts.toMillis()) : "just now"}</p></div></li>`).join("")}</ul>`
        : `<p class="ava-empty-line">${S.unsubEvents ? "No interactions recorded yet." : "Loading…"}</p>`}</article>`;
  }

  /* admin's own approximate location (network-based, no GPS prompt) */
  async function showMyLocation() {
    const el = root.querySelector("#avaMyLoc"); if (!el) return;
    if (!ANALYTICS.GEO_ENDPOINT) { el.textContent = "Location unavailable — geolocation endpoint not configured."; return; }
    try {
      const r = await fetch(ANALYTICS.GEO_ENDPOINT, { cache: "no-store" }); const j = await r.json();
      el.textContent = j.city || j.region ? `Approximately ${[j.city, j.region].filter(Boolean).join(", ")}` : "Location unavailable for this connection.";
    } catch (e) { el.textContent = "Location unavailable."; }
  }

  document.querySelectorAll("[data-open-analytics]").forEach(b => b.addEventListener("click", open));
  window.openLiveAnalytics = open;
  return { open, close };
}
