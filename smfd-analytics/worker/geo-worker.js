/* Cloudflare Worker — approximate, keyless geolocation for SMFD analytics.
   Reads Cloudflare's own edge metadata (request.cf). It never reads, logs or returns the visitor's IP.
   City/region come from the network (IP) and are APPROXIMATE: mobile carriers and VPNs often resolve to
   a different city. Deploy as a NEW worker (e.g. smfd-geo) and paste its URL into GEO_ENDPOINT. */
const ALLOWED_ORIGINS = [
  "https://selvamuruganfastdrills.com",
  "https://www.selvamuruganfastdrills.com",
  "https://selvamuruganfastdrills.github.io"   // remove if the github.io address redirects to the .com site
  // , "http://localhost:5500"   // add only while testing
];

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
    const ok = ALLOWED_ORIGINS.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": ok ? origin : "null",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Vary": "Origin"
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (!ok) return new Response("Forbidden", { status: 403, headers: cors });
    const cf = request.cf || {};
    return new Response(JSON.stringify({
      city: cf.city || null, region: cf.region || null, country: cf.country || null
    }), { headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  }
};
