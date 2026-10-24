/* Pure helpers shared by tracker + dashboard (no Firebase, unit-testable). */
export const TZ = "Asia/Kolkata";

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" });

/** "YYYY-MM-DD" in India Standard Time */
export const istDay = (d = new Date()) => dayFmt.format(d);
/** 0-23 in India Standard Time */
export const istHour = (d = new Date()) => Number(hourFmt.format(d));

export function addDays(dayStr, n) {
  const d = new Date(dayStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Largest-remainder rounding: returned integers always add up to 100 (or all 0). */
export function roundPercents(counts) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return counts.map(() => 0);
  const raw = counts.map(c => (c / total) * 100);
  const floor = raw.map(Math.floor);
  let left = 100 - floor.reduce((a, b) => a + b, 0);
  raw.map((r, i) => ({ i, f: r - Math.floor(r) }))
    .sort((a, b) => b.f - a.f)
    .forEach(o => { if (left-- > 0) floor[o.i]++; });
  return floor;
}

export function fmtDuration(ms) {
  const s = Math.round((ms || 0) / 1000);
  if (s < 60) return s + "s";
  const m = Math.floor(s / 60), r = s % 60;
  return m + "m " + String(r).padStart(2, "0") + "s";
}

export function timeAgo(ms) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return s + "s ago";
  if (s < 3600) return Math.floor(s / 60) + " min ago";
  return Math.floor(s / 3600) + " h ago";
}

/** Letters + spaces only, max 40 chars; anything else becomes "Unknown". */
export function sanitizePlace(s) {
  const t = String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z ]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
  return t || "Unknown";
}

export const sanitizeKey = (s, max = 40) =>
  String(s || "").toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, max);

export const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g,
  c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const fmtNum = n => new Intl.NumberFormat("en-IN").format(n || 0);
