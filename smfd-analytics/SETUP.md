# SMFD Live Visitor Analytics — setup, rules of counting, test plan

## 1. What is in this package
| File | Purpose |
|---|---|
| `js/analytics/analytics-config.js` | **Only file to edit**: Firebase config, geo endpoint, timings |
| `js/analytics/analytics-tracker.js` | Public-site tracker (page views, sessions, heartbeats, interactions) |
| `js/analytics/analytics-session.js`, `-device.js`, `-utils.js` | Session/engaged clock, classifier, pure helpers |
| `js/analytics/analytics-dashboard.js` + `css/analytics-dashboard.css` | Admin-only 4-tab modal |
| `admin-analytics.html` | Standalone admin page (login + dashboard) |
| `firestore.rules`, `firestore.indexes.json` | Security rules (no composite indexes needed) |
| `worker/geo-worker.js` | Optional Cloudflare Worker for approximate city/state |

Runs on the free **Spark** plan: no Cloud Functions. Keep this in mind (section 7).

## 2. Firebase console (once)
1. **Authentication → Sign-in method**: enable **Anonymous** (visitors; gives each browser a uid for rules) and **Email/Password** (admin).
2. **Authentication → Users → Add user**: create your admin account. Copy its **UID**.
3. **Firestore → Data**: create collection `admins`, document ID = that UID, any field (e.g. `role: "owner"`). Clients can never write this collection.
4. **Firestore → Rules**: paste `firestore.rules` → Publish. (Or `firebase deploy --only firestore:rules`.)
5. **Authentication → Settings → Authorized domains**: add `selvamuruganfastdrills.com` and `www.selvamuruganfastdrills.com` (and keep `selvamuruganfastdrills.github.io` if it still serves the site).
6. **Firestore → TTL**: add a policy on field `expireAt` for collection groups `analyticsSessions` (30 d), `analyticsEvents` (90 d), `analyticsDaily` and `analyticsGeo` (400 d). This is the retention/cleanup mechanism.
7. Optional: **App Check** (reCAPTCHA v3) reduces scripted abuse of the public write path.

## 3. Configure
Edit `analytics-config.js`: paste `apiKey`, `messagingSenderId`, `appId` from Project settings → Web app.

## 4. Location (optional, keyless)
Deploy `worker/geo-worker.js` as a **new** Cloudflare Worker (e.g. `smfd-geo`), then set `GEO_ENDPOINT` to its URL. It returns Cloudflare's approximate city/region only and never logs or returns the IP. Without it, location is honestly shown as "Unknown". City ≠ district: Cloudflare does not provide district.

## 5. Add to the website (3 one-line edits, nothing else changes)
Before `</body>` in `index.html`, `quotation.html` and `ai_chat.html`:
```html
<script type="module" src="js/analytics/analytics-tracker.js"></script>
```
The admin page lives at `https://selvamuruganfastdrills.com/admin-analytics.html`. Upload `js/analytics/`, `css/analytics-dashboard.css`, `admin-analytics.html`, then open `/admin-analytics.html` and sign in.
To open it from an existing admin button instead: load the CSS, add `data-open-analytics` to the button, and
`import { initAnalyticsDashboard } from "./js/analytics/analytics-dashboard.js"; initAnalyticsDashboard();`.

`quotation.html` already loads `js/tracker.js` (it did not exist in the repo). This package now includes it as a one-line file that starts the tracker, so **do not add a second script tag to `quotation.html`**; only `index.html` and `ai_chat.html` need the tag above.

## 6. Counting rules (as implemented)
- **Page view**: once per genuine page load, after the tab is visible. A deliberate reload counts. Back/forward cache restores, prerenders and a double-included script do not. Dashboard use is never counted (tracker is disabled on `admin-analytics*`).
- **Session**: random anonymous id in localStorage, shared by tabs; new after 30 min idle. "Live Active Users" = distinct **sessions** (not tabs) whose server-timestamped heartbeat is ≤ 90 s old. Heartbeat every 30 s while the tab is visible. Closed tabs simply expire; `beforeunload` is not relied on.
- **Engaged time**: tab visible AND user acted within the last 30 s. Average = total engaged ms ÷ sessions.
- **Percentages**: denominators are shown under every chart; largest-remainder rounding makes each group total exactly 100%.
- **Enquiry events are intent, not outcomes**: your enquiry form only opens WhatsApp (no server confirmation), so `contact_submit` = "validated form → WhatsApp opened"; call/WhatsApp are taps. Peak hours use these three intents (IST). No form text, phone numbers or chat text is ever read.
- **Delivery** is at-least-once through a small localStorage outbox, so a tap followed by instant navigation is not lost; rare duplicates are possible.
- **Sections** counted: Landing, AI Assistant, Service Areas, Calculator, Reviews, FAQ, Gallery. "Drilling rig specifications" was not found as a tagged section, so it is not tracked. Add `data-track-section="Name"` plus an entry in `SECTION_MAP`, `sec_*` in the rules' `dailyKeys()` and the dashboard to add more.

## 7. Honest limits of the free (Spark) design
- Counters are written by the visitor's browser. Rules bound every write (field allow-list, +1 per write, session ownership, 2 s rate limit) but a determined attacker with the public config could still inflate counts. For tamper-proof numbers, move ingestion to Cloud Functions (Blaze plan) and set rules to `allow write: if false` for clients.
- Day buckets use the visitor's clock converted to IST; heartbeats and `lastSeen` use server time. The live window compares server `lastSeen` with the admin's clock, so a badly wrong admin clock skews "live" counts.
- Spark quota is 20k writes/day. Roughly 8 writes per 2-minute visit, so about 2,000 visits/day before you hit it. Reads: the dashboard does ~100 + ≤90 + ≤3000 reads per refresh (60 s auto, only while open and visible).
- Location is IP/network based and approximate (carrier networks and VPNs often resolve to another city).

## 8. Test plan (nothing below has been run against your Firebase project)
1. Open the site in a normal window: `analyticsDaily/<today IST>.pv` rises by exactly 1; reload = +1; back/forward = +0.
2. Open two tabs: `analyticsSessions` has one doc; Live Active Users = 1. Close both: it falls to 0 within ~90 s.
3. Tap Call/WhatsApp, use calculator, press "View Quotation" with and without required fields (invalid must not count), send enquiry form with a blank field (must not count).
4. Check device/browser rows against a phone, desktop and an iPhone running Chrome (iOS + Chrome).
5. Without `GEO_ENDPOINT` everything lands under "Unknown" and rankings show the "not enough data" message.
6. Signed-out / non-admin account: dashboard shows login / "Not authorised"; in the Rules Playground confirm anonymous users cannot read any `analytics*` collection and cannot update `analyticsEvents`, `admins`, or another uid's session.
7. Change the date range; confirm numbers change. Close and reopen the dashboard: no duplicate listeners (Network tab shows one Listen channel).
8. Resize to 320/360/390/430/768/1024/1440 px; verify only the body scrolls and the footer stays visible.
9. Use a **separate Firebase project** (or `TRACK_LOCALHOST: false` and a staging copy) for synthetic traffic so production counts stay genuine.

## 9. Privacy text you can publish
"We count visits anonymously to improve the site. We store a random visit id, the pages and features used, a rough device/browser type and an approximate city/state. We do not store your name, phone number, messages or IP address. Set Do Not Track or Global Privacy Control to opt out, or ask us to disable it."
