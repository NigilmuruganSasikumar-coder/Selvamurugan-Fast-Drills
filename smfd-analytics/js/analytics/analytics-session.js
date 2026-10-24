/* Anonymous session + engaged-time clock. Nothing here identifies a person:
   the session id is a random value kept in localStorage and rotated after 30 min idle. */
import { ANALYTICS } from "./analytics-config.js";

const KEY = "smfd_an_session";
const mem = {};                               // fallback if storage is blocked
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return mem.s || null; } };
const write = s => { mem.s = s; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };

export function newId() {
  const a = new Uint8Array(12);
  (self.crypto || window.crypto).getRandomValues(a);
  return "s" + Array.from(a, b => b.toString(16).padStart(2, "0")).join("");   // [a-z0-9], 25 chars
}

/** Returns {id, uid, startedAt, last, inter, n, isNew}. A session is reused while idle < SESSION_IDLE_MS. */
export function loadSession(uid, forceNew = false) {
  const now = Date.now();
  let s = read();
  const stale = !s || !s.id || s.uid !== uid || now - (s.last || 0) > ANALYTICS.SESSION_IDLE_MS;
  if (forceNew || stale) {
    s = { id: newId(), uid, startedAt: now, last: now, inter: false, n: 0, isNew: true };
  } else {
    s.isNew = false;
  }
  write(s);
  return s;
}
export function touchSession(s) { s.last = Date.now(); write(s); }
export function saveSession(s) { write(s); }

/** Engaged time = time the page is visible AND the user acted within ENGAGED_IDLE_MS. */
export class EngagedClock {
  constructor() {
    this.ms = 0; this.lastTick = Date.now(); this.lastAct = Date.now();
    const act = () => { this.lastAct = Date.now(); };
    ["pointerdown", "keydown", "touchstart", "wheel", "scroll"].forEach(e =>
      addEventListener(e, act, { passive: true, capture: true }));
    this.timer = setInterval(() => this.tick(), 1000);
  }
  tick() {
    const now = Date.now(), dt = Math.min(now - this.lastTick, 2000);
    this.lastTick = now;
    if (document.visibilityState === "visible" && now - this.lastAct < ANALYTICS.ENGAGED_IDLE_MS) this.ms += dt;
  }
  /** Engaged ms accumulated since the previous call. */
  take() { this.tick(); const v = this.ms; this.ms = 0; return Math.round(v); }
}
