// End-to-end test for product & service moderation (Task 1).
//
// Covers:
//  - Authenticated access (admin only) for approve (publish) / reject (archive)
//  - Regression: every moderation action is recorded in audit_logs (exposed via /preview)
//  - Auth enforcement: owner & client (non-admin) and unauthenticated => 401
//  - Input validation: invalid status => 400, invalid uuid => 400, unknown id => 404
//  - Public visibility: anonymous clients only see "published" content
//
// Requires a running dev server:  npm run dev   (defaults to http://localhost:3000)
// Then run:  node scripts/tests/moderation.e2e.cjs
// Override base URL with MOD_TEST_BASE=http://host:port
//
// ADMIN CREDENTIALS (for the full admin flow):
//   Provide an existing admin account so the test can exercise the approve/
//   reject + audit path. Set in .env.local or the environment:
//     MOD_TEST_ADMIN_EMAIL=admin@example.com
//     MOD_TEST_ADMIN_PASSWORD=********
//   If omitted, the test still validates 401 enforcement + public visibility
//   and skips the admin-only assertions.

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
const BASE = (env.MOD_TEST_BASE || "http://localhost:3000").replace(/\/$/, "");
const ADMIN_EMAIL = env.MOD_TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = env.MOD_TEST_ADMIN_PASSWORD;

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
  const email = `modtest+${role}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = "Testpass123!";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `ModTest ${role}` },
  });
  if (error) throw new Error(`createUser(${role}) failed: ${error.message}`);
  const id = data.user.id;
  // owner/client are allowed by the protect_profile_role trigger (non-admin toggle).
  if (role === "owner" || role === "client") {
    const { error: re } = await admin.from("profiles").update({ role }).eq("id", id);
    if (re) throw new Error(`setRole(${role}) failed: ${re.message}`);
  }
  const { data: signIn, error: se } = await anonClient.auth.signInWithPassword({ email, password });
  if (se) throw new Error(`signIn(${role}) failed: ${se.message}`);
  created.users.push(id);
  return { id, email, session: signIn.session };
}

async function signInAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return null;
  const { data, error } = await anonClient.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (error) throw new Error(`signIn(admin) failed: ${error.message}`);
  // Confirm this account actually has the admin role.
  const { data: prof } = await admin.from("profiles").select("role").eq("id", data.user.id).single();
  if (!prof || prof.role !== "admin") {
    throw new Error("Provided admin credentials are not for an admin account (role=" + (prof && prof.role) + ")");
  }
  return { id: data.user.id, email: ADMIN_EMAIL, session: data.session };
}

async function firstCategoryId() {
  const { data } = await admin.from("categories").select("id").limit(1).single();
  if (!data) throw new Error("no categories seeded");
  return data.id;
}

async function makeBusiness(ownerId, status, catId) {
  const slug = `modtest-biz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await admin
    .from("businesses")
    .insert({ owner_id: ownerId, category_id: catId, slug, name: "ModTest Biz", status })
    .select("id")
    .single();
  if (error) throw new Error(`makeBusiness failed: ${error.message}`);
  created.businesses.push(data.id);
  return data.id;
}

async function makeProduct(businessId, status, name) {
  const slug = `modtest-prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await admin
    .from("products")
    .insert({
      business_id: businessId,
      slug,
      name: name || "ModTest Product",
      status,
      price: 10,
      currency: "MAD",
      stock: 1,
      images: [],
      tags: [],
    })
    .select("id")
    .single();
  if (error) throw new Error(`makeProduct failed: ${error.message}`);
  created.products.push(data.id);
  return data.id;
}

async function makeService(businessId, status, name) {
  const { data, error } = await admin
    .from("services")
    .insert({ business_id: businessId, name: name || "ModTest Service", status, price: 10, duration_minutes: 30 })
    .select("id")
    .single();
  if (error) throw new Error(`makeService failed: ${error.message}`);
  created.services.push(data.id);
  return data.id;
}

async function callApi({ session, method = "PATCH", path, body }) {
  const headers = { "Content-Type": "application/json" };
  if (session) headers["Cookie"] = cookieFor(session);
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
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
  results.push({ name, pass, skipped: false });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail != null ? `  (${detail})` : ""}`);
}
function skip(name, reason) {
  results.push({ name, pass: true, skipped: true });
  console.log(`SKIP  ${name}  (${reason})`);
}

async function main() {
  try {
    await fetch(BASE + "/", { method: "GET" });
  } catch (e) {
    console.error(`Cannot reach dev server at ${BASE}. Start it with: npm run dev`);
    process.exit(2);
  }

  const catId = await firstCategoryId();

  const adminU = await signInAdmin();
  const ownerU = await makeUser("owner");
  const clientU = await makeUser("client");

  const ownerBiz = await makeBusiness(ownerU.id, "approved", catId);
  await makeBusiness(adminU ? adminU.id : ownerU.id, "approved", catId);

  // Rows used for the publish/reject moderation flow (only driven when admin present)
  const pModDraft = await makeProduct(ownerBiz, "draft", "ModDraft Prod");
  const pModPublished = await makeProduct(ownerBiz, "published", "ModPubProd");
  const sModDraft = await makeService(ownerBiz, "draft", "ModDraft Svc");
  const sModPublished = await makeService(ownerBiz, "published", "ModPubSvc");

  // Rows used purely for visibility assertions (never mutated)
  const pPublished = await makeProduct(ownerBiz, "published", "VisPubProd");
  const pDraft = await makeProduct(ownerBiz, "draft", "VisDraftProd");
  const pArchived = await makeProduct(ownerBiz, "archived", "VisArchProd");
  const sPublished = await makeService(ownerBiz, "published", "VisPubSvc");
  const sDraft = await makeService(ownerBiz, "draft", "VisDraftSvc");

  if (adminU) {
    // ---- Authenticated access: admin publishes a draft product ----
    let r = await callApi({
      session: adminU.session,
      path: "/api/admin/products",
      body: { id: pModDraft, status: "published", status_note: "approve via test" },
    });
    check("admin publish product -> 200", r.status === 200, `status=${r.status}`);
    let { data: p } = await admin.from("products").select("status").eq("id", pModDraft).single();
    check("product status is 'published' in DB", p && p.status === "published", `status=${p && p.status}`);

    // ---- Regression: action recorded in audit_logs ----
    const { data: audit } = await admin
      .from("audit_logs")
      .select("action, metadata")
      .eq("target_type", "product")
      .eq("target_id", pModDraft)
      .limit(1);
    const a = audit && audit[0];
    check("audit_logs entry recorded (product.status_change)", !!a && a.action === "product.status_change", JSON.stringify(a && a.action));
    check(
      "audit metadata from/to correct",
      a && a.metadata && a.metadata.from === "draft" && a.metadata.to === "published",
      JSON.stringify(a && a.metadata)
    );

    // ---- History is queryable via /preview ----
    r = await callApi({ session: adminU.session, method: "GET", path: `/api/admin/products/preview?id=${pModDraft}` });
    check("preview GET -> 200", r.status === 200, `status=${r.status}`);
    const mods = ((r.json && r.json.audit) || []).filter((x) => x.isModeration);
    check("preview exposes moderation audit", mods.length >= 1, `mods=${mods.length}`);

    // ---- Authenticated access: admin rejects (archives) a published product ----
    r = await callApi({ session: adminU.session, path: "/api/admin/products", body: { id: pModPublished, status: "archived" } });
    check("admin archive product -> 200", r.status === 200, `status=${r.status}`);
    ({ data: p } = await admin.from("products").select("status").eq("id", pModPublished).single());
    check("product status is 'archived' in DB", p && p.status === "archived", `status=${p && p.status}`);

    // ---- Services moderation ----
    r = await callApi({ session: adminU.session, path: "/api/admin/services", body: { id: sModDraft, status: "published" } });
    check("admin publish service -> 200", r.status === 200, `status=${r.status}`);
    ({ data: p } = await admin.from("services").select("status").eq("id", sModDraft).single());
    check("service status is 'published' in DB", p && p.status === "published", `status=${p && p.status}`);

    r = await callApi({ session: adminU.session, path: "/api/admin/services", body: { id: sModPublished, status: "archived" } });
    check("admin archive service -> 200", r.status === 200, `status=${r.status}`);

    // ---- Input validation (needs an authenticated admin request) ----
    r = await callApi({ session: adminU.session, path: "/api/admin/products", body: { id: pModDraft, status: "bogus" } });
    check("invalid status -> 400", r.status === 400, `status=${r.status}`);

    r = await callApi({ session: adminU.session, path: "/api/admin/products", body: { id: "not-a-uuid", status: "published" } });
    check("invalid uuid id -> 400", r.status === 400, `status=${r.status}`);

    r = await callApi({ session: adminU.session, path: "/api/admin/products", body: { id: adminU.id, status: "published" } });
    check("non-existent valid id -> 404", r.status === 404, `status=${r.status}`);
  } else {
    skip("admin publish product -> 200", "no MOD_TEST_ADMIN_EMAIL/PASSWORD");
    skip("product status is 'published' in DB", "no admin credentials");
    skip("audit_logs entry recorded (product.status_change)", "no admin credentials");
    skip("audit metadata from/to correct", "no admin credentials");
    skip("preview GET -> 200", "no admin credentials");
    skip("preview exposes moderation audit", "no admin credentials");
    skip("admin archive product -> 200", "no admin credentials");
    skip("product status is 'archived' in DB", "no admin credentials");
    skip("admin publish service -> 200", "no admin credentials");
    skip("service status is 'published' in DB", "no admin credentials");
    skip("admin archive service -> 200", "no admin credentials");
    skip("invalid status -> 400", "no admin credentials");
    skip("invalid uuid id -> 400", "no admin credentials");
    skip("non-existent valid id -> 404", "no admin credentials");
  }

  // ---- Auth enforcement (no admin needed) ----
  let r = await callApi({ session: ownerU.session, path: "/api/admin/products", body: { id: pModDraft, status: "published" } });
  check("owner (non-admin) -> 401", r.status === 401, `status=${r.status}`);

  r = await callApi({ session: clientU.session, path: "/api/admin/products", body: { id: pModDraft, status: "published" } });
  check("client (non-admin) -> 401", r.status === 401, `status=${r.status}`);

  r = await callApi({ path: "/api/admin/products", body: { id: pModDraft, status: "published" } });
  check("unauthenticated -> 401", r.status === 401, `status=${r.status}`);

  // ---- Public visibility (no admin needed) ----
  const { data: visP } = await anonClient.from("products").select("id").eq("business_id", ownerBiz);
  const visPids = (visP || []).map((x) => x.id);
  check("anon sees published product", visPids.includes(pPublished), `vis=${visPids.join(",")}`);
  check("anon does NOT see draft product", !visPids.includes(pDraft), `vis=${visPids.join(",")}`);
  check("anon does NOT see archived product", !visPids.includes(pArchived), `vis=${visPids.join(",")}`);

  const { data: visS } = await anonClient.from("services").select("id").eq("business_id", ownerBiz);
  const visSids = (visS || []).map((x) => x.id);
  check("anon sees published service", visSids.includes(sPublished), `vis=${visSids.join(",")}`);
  check("anon does NOT see draft service", !visSids.includes(sDraft), `vis=${visSids.join(",")}`);

  const failed = results.filter((x) => !x.pass && !x.skipped);
  const skipped = results.filter((x) => x.skipped);
  console.log(`\n==== ${results.length - failed.length - skipped.length}/${results.length - skipped.length} passed, ${skipped.length} skipped ====`);
  if (failed.length) {
    console.log("FAILURES:");
    failed.forEach((f) => console.log("  - " + f.name));
  }
  if (skipped.length) {
    console.log("NOTE: admin-only checks were skipped. Set MOD_TEST_ADMIN_EMAIL / MOD_TEST_ADMIN_PASSWORD to enable them.");
  }
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
