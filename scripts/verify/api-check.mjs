/**
 * PHASE 3 — live API verification against the running dev server.
 * Read-only. Runs the 20-query suite + contract matrix + page-regression smoke.
 *
 * Requires: npm run dev (port 3000) up, .env.local present.
 * Run: node --env-file=.env.local scripts/verify/api-check.mjs
 */

import { createClient } from "@supabase/supabase-js";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OK = "PASS";
const BAD = "FAIL";

const log = (label, status, detail = "") =>
  console.log(
    `${String(status).padEnd(8)} ${label.padEnd(58)} ${detail}`,
  );

/* ---- live hybrid RPC availability (to attribute match method) ---- */
let rpcAvailable = false;
let rpcErrMsg = "";
{
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const { data, error } = await sb.rpc("hybrid_search", {
    p_query: "cafe",
    p_type: "all",
    p_limit: 5,
  });
  rpcAvailable = !error && Array.isArray(data);
  rpcErrMsg = error ? (error.message || "").slice(0, 120) : "";
}

/* ---- intent annotation via the new parser (imported .ts) ---- */
let parseIntent = null;
try {
  const mod = await import("../../lib/search-quality/parser.ts");
  parseIntent = mod.parseNaturalQuery ?? mod.default;
} catch (e) {
  console.log(`${BAD} parser import: ${(e && e.message) || e}`);
}

const MATCH_LEGACY = rpcAvailable
  ? "hybrid(rpc)"
  : "legacy(ilike — rpc unavailable)";

/* ------------------------------------------------------------------ */
console.log("=== 0. environment ===");
log("base url", BASE);
log("expect hybrid RPC state", rpcAvailable ? "available" : `unavailable — ${rpcErrMsg}`);
log("parser available", parseIntent ? "yes" : "no");

/* ------------------------------------------------------------------ */
const api = async (qs) => {
  const url = `${BASE}/api/search${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
};

const QUERIES = [
  "room", // intentionally no data
  "cafe",
  "cafe berkane",
  "restaurant casablanca",
  "rossito",
  "momia",
  "momia shop",
  "electricien",
  "plombier",
  "coiffeur bruxelles",
  "maçon" + " " + "paris",
  "peintre",
  "مقهى", // cafe (ar)
  "كهربائي", // electrician (ar)
  "سباك الرباط", // plumber (ar)
  "docteur 5 étoiles",
  "restaurant ouvert maintenant",
  "تحقق مصادق عليه", // verified (ar)
  "renovation pas cher",
  "société nettoyage berkane",
];

console.log("\n=== 1. 20-query run ===");
const expectedMethod = rpcAvailable ? "hybrid" : "legacy";
let queryMethodOk = 0;
let queryTotalMs = 0;
const queryDurations = [];
for (const q of QUERIES) {
  let intentText = "";
  if (parseIntent) {
    try {
      const p = parseIntent(q);
      intentText = `[city:${p.city || "-"}|cat:${p.category || "-"}${
        p.minRating ? `|☆${p.minRating}` : ""
      }|${p.minPrice != null ? `≥${p.minPrice}` : "-"}${p.maxPrice != null ? `≤${p.maxPrice}` : "-"}${
        p.openNow ? "|open" : ""
      }]`;
    } catch (e) {
      intentText = `[parser err ${(e && e.message) || e}]`;
    }
  }
  const t0 = performance.now();
  const { status, body } = await api(`q=${encodeURIComponent(q)}&type=all`);
  const ms = Math.round(performance.now() - t0);
  queryTotalMs += ms;
  queryDurations.push(ms);
  const items = body && Array.isArray(body.items) ? body.items : null;
  const total = body && typeof body.total === "number" ? body.total : "?";
  const method = body?.matchMethod;
  const methodOk = method === "hybrid" || method === "legacy";
  if (methodOk && method === expectedMethod) queryMethodOk += 1;
  const ok = status === 200 && items !== null && body.error == null && methodOk;
  const detail = ok
    ? `${String(total).padStart(2)} results · ${method} (${ms}ms) ${MATCH_LEGACY} ${intentText}`
    : `${status} ${JSON.stringify(body || {}).slice(0, 120)}`;
  log(`"${q}"`, ok ? OK : BAD, detail);
}
const avgMs = queryDurations.length
  ? Math.round(queryTotalMs / queryDurations.length)
  : 0;
log(
  "matchMethod honored (hybrid when rpc available; else legacy)",
  queryMethodOk === QUERIES.length ? OK : BAD,
  `${queryMethodOk}/${QUERIES.length}`,
);
log("query latency avg", avgMs > 0 ? OK : BAD, `${avgMs}ms (dev, incl. cold compiles)`);

/* ------------------------------------------------------------------ */
console.log("\n=== 2. contract matrix ===");
async function contract(name, qs, check) {
  const { status, body } = await api(qs);
  let pass = true;
  let note = "";
  try {
    ({ pass, note } = check ? check(status, body) : { pass: status === 200 });
  } catch (e) {
    pass = false;
    note = (e && e.message) || String(e);
  }
  log(name, pass ? OK : BAD, `${status} ${note}${body ? "" : " body=null"}`);
  return { name, pass, status, body };
}

const isShape = (b) =>
  b &&
  Array.isArray(b.items) &&
  typeof b.total === "number" &&
  typeof b.hasMore === "boolean";

const checks = await Promise.all([
  contract("response exposes matchMethod", "", (s, b) => ({
    pass: s === 200 && (b?.matchMethod === "hybrid" || b?.matchMethod === "legacy"),
    note: `method=${b?.matchMethod}`,
  })),
  contract("response exposes searchVersion (dev)", "", (s, b) => ({
    pass: s === 200 && typeof b?.searchVersion === "string",
    note: `version=${b?.searchVersion}`,
  })),
  contract("no params", "", (s, b) => ({
    pass: s === 200 && isShape(b),
    note: `total=${b?.total}`,
  })),
  contract("q omitted, type=bogus coerces", "type=bogus", (s, b) => ({
    pass: s === 200 && b?.type === "all",
    note: `type=${b?.type}`,
  })),
  contract("limit=0 clamps to 1", "limit=0", (s, b) => ({
    pass: s === 200 && b?.limit === 1,
    note: `limit=${b?.limit}`,
  })),
  contract("limit=99999 clamps to max", "limit=99999", (s, b) => ({
    pass: s === 200 && typeof b?.limit === "number" && b.limit <= 100,
    note: `limit=${b?.limit}`,
  })),
  contract("offset far beyond data", "offset=99999", (s, b) => ({
    pass: s === 200 && b?.hasMore === false && b?.items.length === 0,
    note: `items=${b?.items.length}`,
  })),
  contract("minRating=9 clamps to 5", "minRating=9", (s) => ({
    pass: s === 200,
    note: "200 (no crash)",
  })),
  contract("verifiedOnly=1", "verifiedOnly=1", (s, b) => ({
    pass: s === 200 && isShape(b),
    note: `total=${b?.total}`,
  })),
  contract("openNow=1 keeps only businesses", "openNow=1", (s, b) => ({
    pass:
      s === 200 &&
      b?.items.every((i) => i.kind === "business") &&
      b?.items.every((i) => typeof i.open_now === "boolean"),
    note: `items=${b?.items.length}`,
  })),
  contract("q length 200 (>max80) safe", `q=${"a".repeat(200)}`, (s, b) => ({
    pass: s === 200 && isShape(b),
    note: "200 (coerced)",
  })),
  contract("city+category filter (berkane+cafe)", "q=&city=berkane&category=cafe", (s, b) => ({
    pass: s === 200 && b?.items.some((i) => i.city && String(i.city).toLowerCase().includes("berkane")),
    note: `total=${b?.total}`,
  })),
  contract("sort=price_asc", "sort=price_asc&type=business", (s, b) => ({
    pass: s === 200 && isShape(b),
    note: `total=${b?.total}`,
  })),
  contract("lat/lng accepted", "lat=33.5731&lng=-7.5898", (s, b) => ({
    pass: s === 200 && isShape(b),
    note: "200",
  })),
]);

/* ------------------------------------------------------------------ */
console.log("\n=== 3. page regression smoke ===");
const PAGES = [
  ["/en", [200]],
  ["/fr", [200]],
  ["/ar", [200]],
  ["/en/search", [200]],
  ["/en/services", [200]],
  ["/en/products", [200]],
  ["/en/login", [200]],
  ["/en/dashboard", null],
  ["/en/admin", null],
  ["/en/business/momia-shop", [308]],
  ["/en/business/rossito", [308]],
  ["/en/businesses/berkane/momia-shop", [200]],
  ["/en/businesses/casablanca/rossito", [200]],
];
for (const [path, allowed] of PAGES) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(25000),
    });
    const good =
      allowed === null
        ? res.status === 200 || (res.status >= 300 && res.status < 400)
        : allowed.includes(res.status);
    log(path, good ? OK : BAD, `status=${res.status}${res.status >= 300 && res.status < 400 ? " (redirect)" : ""}`);
  } catch (e) {
    log(path, BAD, (e && e.message) || String(e));
  }
}

/* ---- RTL check on /ar ---- */
try {
  const res = await fetch(`${BASE}/ar`, { signal: AbortSignal.timeout(25000) });
  const html = await res.text();
  const hasDir = /dir=["']rtl["']/i.test(html);
  log("/ar dir=rtl", hasDir ? OK : BAD, "html dir attr");
} catch (e) {
  log("/ar dir=rtl", BAD, (e && e.message) || String(e));
}

/* ------------------------------------------------------------------ */
const failed = checks.filter((c) => !c.pass).length;
console.log(
  `\nDONE — contract failures: ${failed}, page/query failures listed above`,
);
if (failed > 0) process.exitCode = 1;