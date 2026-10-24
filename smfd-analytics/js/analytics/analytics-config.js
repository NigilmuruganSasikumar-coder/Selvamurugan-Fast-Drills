/* ==========================================================================
   SMFD Analytics — configuration (the ONLY file you need to edit)
   The Firebase web config is public by design; security comes from
   firestore.rules, not from hiding these values.
   ========================================================================== */

// Firebase console → Project settings → Your apps → Web app → firebaseConfig
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCmmYiAHzLTXeKeSzCD1VVaZvHJDGyS-8A",
  authDomain: "selvamuruganfastdrills-d084a.firebaseapp.com",
  projectId: "selvamuruganfastdrills-d084a",
  storageBucket: "selvamuruganfastdrills-d084a.firebasestorage.app",
  messagingSenderId: "421285378379",
  appId: "1:421285378379:web:f638b3c10a1bf83e3ad0ce"
};

export const ANALYTICS = {
  ENABLED: true,
  TRACK_LOCALHOST: false,        // keep false so your own testing never pollutes production data
  IGNORE_AUTOMATION: true,       // skip navigator.webdriver (bots / headless browsers)
  REQUIRE_CONSENT: false,        // true → track only after SMFDAnalytics.setConsent(true)

  // Cloudflare Worker URL from worker/geo-worker.js ("" = location stays "Unknown")
  GEO_ENDPOINT: "",
  GEO_TIMEOUT_MS: 2500,

  HEARTBEAT_MS: 30000,           // heartbeat while the page is visible
  ACTIVE_WINDOW_MS: 90000,       // "live" = heartbeat received within the last 90 s
  SESSION_IDLE_MS: 30 * 60000,   // 30 min of inactivity starts a new session
  ENGAGED_IDLE_MS: 30000,        // engaged time only counts if user acted within the last 30 s
  MAX_EVENTS_PER_SESSION: 100,   // client-side spam cap
  MIN_EVENT_GAP_MS: 400,         // identical events closer than this are ignored
  SECTION_DWELL_MS: 1000,        // a section counts as "viewed" after 1 s on screen

  MIN_GEO_SESSIONS: 10,          // dashboard hides rankings until this many located sessions exist
  SESSION_TTL_DAYS: 30,          // Firestore TTL (analyticsSessions.expireAt)
  EVENT_TTL_DAYS: 90,            // Firestore TTL (analyticsEvents.expireAt)
  AGGREGATE_TTL_DAYS: 400        // Firestore TTL (analyticsDaily / analyticsGeo .expireAt)
};

export const EVENT_TYPES = [
  "page_view", "session_start", "cta_click", "phone_click", "whatsapp_click",
  "calculator_open", "calculator_complete", "quotation_start", "quotation_submit",
  "contact_submit"
];

// Section keys tracked by the IntersectionObserver (selector → key)
export const SECTION_MAP = [
  ["[data-track-section=\"Landing\"]", "landing"],
  ["[data-track-section=\"AI Assistant\"]", "ai_assistant"],
  ["[data-track-section=\"Service Areas\"]", "service_areas"],
  ["[data-track-section=\"Calculator\"]", "calculator"],
  ["[data-track-section=\"Testimonials\"]", "testimonials"],
  ["[data-track-section=\"FAQ\"]", "faq"],
  ["#galary", "gallery"]
];
