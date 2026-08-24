// End-to-end test for owner-scoped Product/Service deletion (Task: archived
// items can be removed by their owner, with server-side authorization).
//
// Covers:
//  - Owner can delete their OWN archived product (200, row actually removed)
//  - Owner can delete their OWN archived service (200, row actually removed)
//  - Another business owner CANNOT delete it (404 — RLS hides the row)
//  - A non-owner client CANNOT delete it (404)
//  - Unauthenticated request is rejected (401)
//  - Owners CANNOT delete a non-archived (published) item (409) — blocks
//    moderation bypass via delete/recreate
//  - A new product can be created after deletion (re-create works)
//
// Requires a running dev server:  npm run dev   (http://localhost:3000)
// Then run:  node scripts/tests/owner-delete.e2e.cjs
// Override base URL with OWNER_DELETE_BASE=http://host:port
//
// Needs .env.local with:
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS script */
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");

function loadEnv() {
  const out = {};
  const raw = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = (env.OWNER_DELETE_BASE || "http://localhost:3000").replace(/\/$/, "");

if (!SUPABASE_URL || !ANON || !SERVICE) {
  console.error("Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(2);
}

const admin = createClient(SUPABASE_URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
const anonClient = createClient(SUPABASE_URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });

const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
const COOKIE = `sb-${ref}-auth-token`;

const created = { users: [], businesses: [], products: [], services: [] };

function cookieFor(session) {
  return `${COOKIE}=${encodeURIComponent(JSON.stringify(session))}`;
}

async function makeUser(role) {
  const email = `ownerdel+${role}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = "Testpass123!";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `OwnerDel ${role}` },
  });
  if (error) throw new Error(`createUser(${role}) failed: ${error.message}`);
  const id = data.user.id;
  if (role === "owner" || role === "client") {
    const { error: re } = await admin.from("profiles").update({ role }).eq("id", id);
    if (re) throw new Error(`setRole(${role}) failed: ${re.message}`);
  }
  const { data: signIn, error: se } = await anonClient.auth.signInWithPassword({ email, password });
  if (se) throw new Error(`signIn(${role}) failed: ${se.message}`);
  created.users.push(id);
  return { id, email, session: signIn.session };
}

async function makeBusiness(ownerId, catId) {
  const slug = `ownerdel-biz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await admin
    .from("businesses")
    .insert({ owner_id: ownerId, category_id: catId, slug, name: "OwnerDel Biz", status: "approved" })
    .select("id")
    .single();
  if (error) throw new Error(`makeBusiness failed: ${error.message}`);
  created.businesses.push(data.id);
  return data.id;
}

async function makeProduct(businessId, status) {
  const slug = `ownerdel-prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await admin
    .from("products")
    .insert({ business_id: businessId, slug, name: "OwnerDel Product", status, price: 10, currency: "MAD", stock: 1, images: [], tags: [] })
    .select("id")
    .single();
  if (error) throw new Error(`makeProduct failed: ${error.message}`);
  created.products.push(data.id);
  return data.id;
}

async function makeService(businessId, status) {
  const { data, error } = await admin
    .from("services")
    .insert({ business_id: businessId, name: "OwnerDel Service", status, price: 10, duration_minutes: 30 })
    .select("id")
    .single();
  if (error) throw new Error(`makeService failed: ${error.message}`);
  created.services.push(data.id);
  return data.id;
}

async function callApi({ session, method = "DELETE", path }) {
  const headers = { "Content-Type": "application/json" };
  if (session) headers["Cookie"] = cookieFor(session);
  const res = await fetch(BASE + path, { method, headers });
  let json = null;
  try {
    json = await res.json();
  } catch (_) {}
  return { status: res.status, json };
}

async function cleanup() {
  if (created.products.length) await admin.from("products").delete().in("id", created.products);
  if (created.services.length) await admin.from("services").delete().in("id", created.services);
  if (created.businesses.length) await admin.from("businesses").delete().in("id", created.businesses);
  for (const id of created.users) {
    try {
      await admin.auth.admin.deleteUser(id);
    } catch (_) {}
  }
}

const results = [];
function check(name, cond, detail) {
  const pass = !!cond;
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail != null ? `  (${detail})` : ""}`);
}

async function main() {
  try {
    await fetch(BASE + "/", { method: "GET" });
  } catch (e) {
    console.error(`Cannot reach dev server at ${BASE}. Start it with: npm run dev`);
    process.exit(2);
  }

  const { data: cat } = await admin.from("categories").select("id").limit(1).single();
  if (!cat) throw new Error("no categories seeded");

  const ownerA = await makeUser("owner");
  const ownerB = await makeUser("owner");
  const client = await makeUser("client");

  const bizA = await makeBusiness(ownerA.id, cat.id);
  const bizB = await makeBusiness(ownerB.id, cat.id);

  // Items used in assertions.
  const pArchA = await makeProduct(bizA, "archived");
  const sArchA = await makeService(bizA, "archived");
  const pArchB = await makeProduct(bizB, "archived"); // another owner's item
  const pPubA = await makeProduct(bizA, "published"); // non-archived own item

  // ---- Owner A can delete their OWN archived product ----
  let r = await callApi({ session: ownerA.session, path: `/api/dashboard/products/${pArchA}` });
  check("owner deletes own archived product -> 200", r.status === 200, `status=${r.status}`);
  const { data: pAfter } = await admin.from("products").select("id").eq("id", pArchA).maybeSingle();
  check("archived product actually removed from DB", pAfter === null, `row=${JSON.stringify(pAfter)}`);

  // ---- Owner A can delete their OWN archived service ----
  r = await callApi({ session: ownerA.session, path: `/api/dashboard/services/${sArchA}` });
  check("owner deletes own archived service -> 200", r.status === 200, `status=${r.status}`);
  const { data: sAfter } = await admin.from("services").select("id").eq("id", sArchA).maybeSingle();
  check("archived service actually removed from DB", sAfter === null, `row=${JSON.stringify(sAfter)}`);

  // ---- Another owner CANNOT delete it (RLS hides the row) ----
  r = await callApi({ session: ownerB.session, path: `/api/dashboard/products/${pArchB}` });
  check("another owner deleting archived product -> 404", r.status === 404, `status=${r.status}`);

  // ---- A non-owner client CANNOT delete it ----
  r = await callApi({ session: client.session, path: `/api/dashboard/products/${pArchB}` });
  check("client deleting archived product -> 404", r.status === 404, `status=${r.status}`);

  // ---- Unauthenticated request is rejected ----
  r = await callApi({ path: `/api/dashboard/products/${pArchB}` });
  check("unauthenticated delete -> 401", r.status === 401, `status=${r.status}`);

  // ---- Owners CANNOT delete a non-archived (published) item (moderation bypass) ----
  r = await callApi({ session: ownerA.session, path: `/api/dashboard/products/${pPubA}` });
  check("owner deleting published product -> 409 (not_archived)", r.status === 409, `status=${r.status}`);

  // ---- Re-create works after deletion ----
  const slug2 = `ownerdel-recreate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data: recreated, error: reErr } = await admin
    .from("products")
    .insert({ business_id: bizA, slug: slug2, name: "OwnerDel Recreate", status: "draft", price: 10, currency: "MAD", stock: 1, images: [], tags: [] })
    .select("id")
    .single();
  check("new product can be created after deletion", !reErr && !!recreated, `err=${reErr && reErr.message}`);
  if (recreated) created.products.push(recreated.id);

  const failed = results.filter((x) => !x.pass);
  console.log(`\n==== ${results.length - failed.length}/${results.length} passed ====`);
  if (failed.length) failed.forEach((f) => console.log("  - " + f.name));
  process.exitCode = failed.length ? 1 : 0;
}

main()
  .catch((e) => {
    console.error("FATAL:", e && e.message ? e.message : e);
    process.exitCode = 2;
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (e) {
      console.error("cleanup error:", e && e.message ? e.message : e);
    }
  });
