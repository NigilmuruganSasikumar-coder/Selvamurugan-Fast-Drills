/* ==========================================================================
   SMFD Analytics — public-site tracker (ES module)
   Add to every public page:  <script type="module" src="js/analytics/analytics-tracker.js"></script>

   Counting rules (documented behaviour)
   - page_view      : once per genuine page load (a deliberate reload counts; bfcache restores,
                      duplicate script includes and prerenders do not). Waits until the tab is visible.
   - session        : random anonymous id in localStorage, shared by tabs, new after 30 min idle.
   - live session   : heartbeat every 30 s while visible; "active" = heartbeat in last 90 s (server time).
   - engaged time   : visible AND user acted in the last 30 s.
   - Clicks (call / WhatsApp / form send) are INTENT events, not confirmed outcomes.
   - Delivery is at-least-once: events are parked in a small localStorage outbox until Firestore
     confirms them, so navigation right after a click does not lose them.
   ========================================================================== */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, doc, collection, writeBatch, serverTimestamp, increment, Timestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { FIREBASE_CONFIG, ANALYTICS, EVENT_TYPES, SECTION_MAP } from "./analytics-config.js";
import { classifyDevice } from "./analytics-device.js";
import { loadSession, touchSession, saveSession, EngagedClock } from "./analytics-session.js";
import { istDay, istHour, sanitizePlace, sanitizeKey } from "./analytics-utils.js";

const APP_NAME = "smfd-analytics";          // named app: never touches your existing default Firebase app
const OUTBOX_KEY = "smfd_an_outbox";
const ENQUIRY_HOUR_TYPES = ["contact_submit", "phone_click", "whatsapp_click"];
const DAY_MS = 86400000;

if (!window.__SMFD_ANALYTICS__) {            // guards against the script being included twice
  window.__SMFD_ANALYTICS__ = true;
  boot().catch(err => console.warn("[analytics] disabled:", err && err.message));
}

/* ------------------------------------------------------------------ gating */
function allowed() {
  if (!ANALYTICS.ENABLED) return false;
  if (!FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey.startsWith("PASTE")) { console.info("[analytics] Firebase config not set"); return false; }
  if (/admin-analytics/.test(location.pathname)) return false;
  if (!ANALYTICS.TRACK_LOCALHOST && /^(localhost|127\.|\[::1\])/.test(location.hostname)) return false;
  if (ANALYTICS.IGNORE_AUTOMATION && navigator.webdriver) return false;
  if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true) return false;
  try {
    if (localStorage.getItem("smfd-analytics-optout") === "1") return false;
    if (ANALYTICS.REQUIRE_CONSENT && localStorage.getItem("smfd-analytics-consent") !== "granted") return false;
  } catch (e) {}
  return true;
}

/* ------------------------------------------------------------------- state */
let db, uid, sess, clock, device, geo = { city: "Unknown", state: "Unknown" };
let currentSection = "", pending = 0, ready = false, beating = false;
const lastSent = {};                          // dedupe key → timestamp
const seenSections = new Set();
let calcOpened = false;

async function boot() {
  if (!allowed()) return;
  await waitUntilVisible();

  const app = getApps().find(a => a.name === APP_NAME) || initializeApp(FIREBASE_CONFIG, APP_NAME);
  const auth = getAuth(app);
  db = getFirestore(app);
  await auth.authStateReady();
  uid = (auth.currentUser || (await signInAnonymously(auth)).user).uid;

  device = classifyDevice();
  clock = new EngagedClock();
  sess = loadSession(uid);
  if (sess.isNew) geo = await fetchGeo();

  ready = true;
  hookInteractions();
  observeSections();

  await flushOutbox();                        // events parked by the previous page
  await startOrContinue(true);
  scheduleHeartbeat();

  addEventListener("visibilitychange", () => {
    beat();                                                         // flush engaged time / resume
  });
  addEventListener("pagehide", () => beat());                      // best effort only
  addEventListener("online", () => { flushOutbox(); beat(); });

  // quotation page: an estimate was generated on the main site and opened here
  if (/quotation/.test(location.pathname)) {
    track("quotation_start", "page_open");
    try {
      const sameSiteRef = document.referrer && new URL(document.referrer).host === location.host && !/quotation/.test(document.referrer);
      if (sameSiteRef && localStorage.getItem("quotationCalc")) track("calculator_complete", "estimate_opened");
    } catch (e) {}
  }

  window.SMFDAnalytics = {
    track,
    optOut() { try { localStorage.setItem("smfd-analytics-optout", "1"); } catch (e) {} },
    optIn() { try { localStorage.removeItem("smfd-analytics-optout"); } catch (e) {} },
    setConsent(v) { try { v ? localStorage.setItem("smfd-analytics-consent", "granted") : localStorage.removeItem("smfd-analytics-consent"); } catch (e) {} }
  };
}

function waitUntilVisible() {
  return new Promise(res => {
    const go = () => {
      if (document.prerendering) return document.addEventListener("prerenderingchange", go, { once: true });
      if (document.visibilityState === "hidden") return document.addEventListener("visibilitychange", go, { once: true });
      res();
    };
    go();
  });
}

async function fetchGeo() {
  const out = { city: "Unknown", state: "Unknown" };
  if (!ANALYTICS.GEO_ENDPOINT) return out;
  try {
    const cached = JSON.parse(sessionStorage.getItem("smfd_an_geo") || "null");
    if (cached) return cached;
  } catch (e) {}
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ANALYTICS.GEO_TIMEOUT_MS);
    const r = await fetch(ANALYTICS.GEO_ENDPOINT, { signal: ctl.signal, cache: "no-store" });
    clearTimeout(t);
    if (r.ok) {
      const j = await r.json();
      if (j.country === "IN" || j.country == null) {
        out.city = sanitizePlace(j.city);
        out.state = sanitizePlace(j.region);
      } else { out.city = "Outside India"; out.state = "Outside India"; }
      try { sessionStorage.setItem("smfd_an_geo", JSON.stringify(out)); } catch (e) {}
    }
  } catch (e) { /* location stays Unknown */ }
  return out;
}

/* ------------------------------------------------------------ write helpers */
const exp = days => Timestamp.fromMillis(Date.now() + days * DAY_MS);
const sessRef = () => doc(db, "analyticsSessions", sess.id);
const dailyRef = day => doc(db, "analyticsDaily", day);
const totalsRef = () => doc(db, "analyticsTotals", "all");

function pageName() { return (location.pathname || "/").slice(0, 100); }

function eventData(type, action, at) {
  return {
    type, action: sanitizeKey(action, 40), sid: sess.id, uid,
    path: pageName(), section: sanitizeKey(currentSection, 40),
    device: device.device, os: device.os, browser: device.browser,
    city: geo.city, state: geo.state,
    day: istDay(new Date(at)), hour: istHour(new Date(at)),
    ts: serverTimestamp(), expireAt: exp(ANALYTICS.EVENT_TTL_DAYS)
  };
}

/** Begin a brand-new session document + counters (pageView=true also counts the page view). */
async function beginSession(pageView) {
  const now = Date.now(), day = istDay(), batch = writeBatch(db);
  batch.set(sessRef(), {
    uid, startedAt: serverTimestamp(), lastSeen: serverTimestamp(),
    page: pageName(), section: "", device: device.device, os: device.os, browser: device.browser,
    city: geo.city, state: geo.state, engagedMs: 0, expireAt: exp(ANALYTICS.SESSION_TTL_DAYS)
  });
  const d = { day, sessions: increment(1), expireAt: exp(ANALYTICS.AGGREGATE_TTL_DAYS) };
  d["dev_" + device.device] = increment(1);
  d["os_" + device.os] = increment(1);
  d["br_" + device.browser] = increment(1);
  const totals = { sessions: increment(1) };
  if (pageView) { d.pv = increment(1); totals.pv = increment(1); }
  batch.set(dailyRef(day), d, { merge: true });
  batch.set(totalsRef(), totals, { merge: true });
  ["city", "state"].forEach(kind => {
    const name = geo[kind];
    batch.set(doc(db, "analyticsGeo", `${day}_${kind}_${name}`),
      { day, kind, name, count: increment(1), expireAt: exp(ANALYTICS.AGGREGATE_TTL_DAYS) }, { merge: true });
  });
  batch.set(doc(collection(db, "analyticsEvents")), eventData("session_start", "", now));
  if (pageView) batch.set(doc(collection(db, "analyticsEvents")), eventData("page_view", "", now));
  await batch.commit();
}

async function startOrContinue(pageView) {
  try {
    if (sess.isNew) {
      sess.isNew = false; saveSession(sess);
      await beginSession(pageView);
    } else if (pageView) {
      const now = Date.now(), day = istDay(), batch = writeBatch(db);
      batch.set(dailyRef(day), { day, pv: increment(1), expireAt: exp(ANALYTICS.AGGREGATE_TTL_DAYS) }, { merge: true });
      batch.set(totalsRef(), { pv: increment(1) }, { merge: true });
      batch.set(doc(collection(db, "analyticsEvents")), eventData("page_view", "", now));
      await batch.commit();
      beat();                                  // refresh page/section on the session doc
    }
  } catch (e) { console.warn("[analytics] start failed", e.code || e.message); }
}

/* --------------------------------------------------------------- heartbeat */
function scheduleHeartbeat() {
  setInterval(() => { if (document.visibilityState === "visible") beat(); }, ANALYTICS.HEARTBEAT_MS);
}

async function beat() {
  if (!ready || beating) return;
  pending = Math.min(pending + clock.take(), 120000);
  if (document.visibilityState === "hidden" && pending === 0) return;
  if (Date.now() - sess.last > ANALYTICS.SESSION_IDLE_MS && pending === 0) return;   // idle tab: let session expire
  beating = true;
  try {
    const batch = writeBatch(db), day = istDay();
    batch.update(sessRef(), {
      lastSeen: serverTimestamp(), page: pageName(), section: sanitizeKey(currentSection, 40),
      engagedMs: increment(pending)
    });
    if (pending > 0) batch.set(dailyRef(day), { day, engagedMs: increment(pending), expireAt: exp(ANALYTICS.AGGREGATE_TTL_DAYS) }, { merge: true });
    await batch.commit();
    pending = 0; touchSession(sess);
  } catch (e) {
    if (e.code === "not-found") { sess = loadSession(uid, true); try { await beginSession(false); sess.isNew = false; saveSession(sess); } catch (x) {} }
    // other failures (offline, rate limit): keep `pending`, retry next beat
  } finally { beating = false; }
}

/* ------------------------------------------------------------------ events */
function counterFor(type, action) {
  if (type === "cta_click" && (action === "ai_chat_open" || action === "ai_chat_message")) return "cta_" + action;
  return "ev_" + type;
}

/** Public: record a meaningful interaction (validated, rate-limited, outbox-backed). */
function track(type, action = "") {
  if (!ready || !EVENT_TYPES.includes(type) || type === "page_view" || type === "session_start") return;
  action = sanitizeKey(action, 40);
  const key = type + ":" + action, now = Date.now();
  if (lastSent[key] && now - lastSent[key] < ANALYTICS.MIN_EVENT_GAP_MS) return;
  lastSent[key] = now;
  if ((sess.n || 0) >= ANALYTICS.MAX_EVENTS_PER_SESSION) return;
  sess.n = (sess.n || 0) + 1; saveSession(sess);

  const item = { id: now + "_" + Math.random().toString(36).slice(2, 8), type, action, at: now };
  const box = readOutbox(); box.push(item); writeOutbox(box.slice(-20));
  sendItem(item);
}

async function sendItem(item) {
  try {
    if (Date.now() - sess.last > ANALYTICS.SESSION_IDLE_MS) {     // long-idle tab: roll the session first
      sess = loadSession(uid, true); await startOrContinue(false);
    }
    const day = istDay(new Date(item.at)), batch = writeBatch(db);
    const d = { day, interactions: increment(1), expireAt: exp(ANALYTICS.AGGREGATE_TTL_DAYS) };
    d[counterFor(item.type, item.action)] = increment(1);
    if (ENQUIRY_HOUR_TYPES.includes(item.type)) d["eh_" + String(istHour(new Date(item.at))).padStart(2, "0")] = increment(1);
    if (!sess.inter) { d.interSessions = increment(1); }
    batch.set(dailyRef(day), d, { merge: true });
    batch.set(doc(collection(db, "analyticsEvents")), eventData(item.type, item.action, item.at));
    await batch.commit();
    if (!sess.inter) { sess.inter = true; saveSession(sess); }
    writeOutbox(readOutbox().filter(x => x.id !== item.id));
  } catch (e) { /* stays in outbox; retried on next page load / when back online */ }
}

const readOutbox = () => { try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || "[]"); } catch (e) { return []; } };
const writeOutbox = v => { try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(v)); } catch (e) {} };

async function flushOutbox() {
  const items = readOutbox().filter(i => Date.now() - i.at < DAY_MS);
  writeOutbox(items);
  for (const i of items) await sendItem(i);
}

/* ----------------------------------------------------------- DOM → events */
function hookInteractions() {
  document.addEventListener("click", e => {
    const el = e.target && e.target.closest ? e.target.closest("a,button") : null;
    if (!el) return;
    const href = (el.getAttribute("href") || "").toLowerCase();

    if (href.startsWith("tel:")) return track("phone_click", "tel_link");
    if (href.includes("wa.me") || href.includes("api.whatsapp.com")) return track("whatsapp_click", "wa_link");
    if (el.id === "whatsappBtn") return track("whatsapp_click", "quote_share");
    if (/ai(?:[ _-]|%20)chat/.test(href)) return track("cta_click", "ai_chat_open");

    if (el.id === "viewQuotationBtn") {          // only count if the app's own validation passed
      setTimeout(() => { const m = document.getElementById("quoteMissingMsg"); if (!m || m.hidden) track("quotation_start", "view_quotation"); }, 0);
      return;
    }
    if (el.id === "efSubmit") {                   // enquiry form: counts only when required fields are filled
      setTimeout(() => {
        const ok = ["efName", "efPhone", "efLocation", "efService"].every(id => { const f = document.getElementById(id); return f && f.value.trim(); });
        if (ok) track("contact_submit", "enquiry_form_whatsapp");      // WhatsApp was opened; delivery is NOT confirmed
      }, 0);
      return;
    }
    if (el.id === "saveImageBtn") return track("quotation_submit", "save_image");
    if (el.id === "savePdfBtn") return track("quotation_submit", "save_pdf");
    if (el.id === "shareBtn") return track("quotation_submit", "share_whatsapp");
  }, { capture: true, passive: true });

  const chat = document.getElementById("chatForm");
  if (chat) chat.addEventListener("submit", () => {
    const i = document.getElementById("chatInput");
    if (i && i.value.trim()) track("cta_click", "ai_chat_message");   // message text is never read or stored
  }, { capture: true });

  const calc = document.getElementById("calculator-section");
  if (calc) ["pointerdown", "input", "change"].forEach(ev => calc.addEventListener(ev, () => {
    if (!calcOpened) { calcOpened = true; track("calculator_open", "first_use"); }
  }, { passive: true }));
}

function observeSections() {
  if (!("IntersectionObserver" in window)) return;
  const timers = new Map();
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      const key = en.target.__avaKey;
      const visible = en.isIntersecting && (en.intersectionRatio >= 0.15 || en.intersectionRect.height >= innerHeight * 0.4);
      if (visible) {
        currentSection = key;
        if (!seenSections.has(key) && !timers.has(key)) {
          timers.set(key, setTimeout(() => {
            timers.delete(key); seenSections.add(key);
            countSection(key);
          }, ANALYTICS.SECTION_DWELL_MS));
        }
      } else if (timers.has(key)) { clearTimeout(timers.get(key)); timers.delete(key); }
    });
  }, { threshold: [0, 0.15, 0.4, 0.75] });
  SECTION_MAP.forEach(([sel, key]) => document.querySelectorAll(sel).forEach(el => { el.__avaKey = key; io.observe(el); }));
}

async function countSection(key) {
  try {
    const day = istDay();
    await writeBatch(db).set(dailyRef(day), { day, ["sec_" + key]: increment(1), expireAt: exp(ANALYTICS.AGGREGATE_TTL_DAYS) }, { merge: true }).commit();
  } catch (e) {}
}
