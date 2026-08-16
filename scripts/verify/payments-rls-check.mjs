/**
 * PHASE 1 — read-only live-database verification of the payment-finalization
 * RLS fix (migration 0023). Uses the service-role key via PostgREST to inspect
 * schema/policies/grants. The scenario-level RLS checks require a real
 * non-admin session and are therefore NOT executed here by default.
 *
 * Run: node --env-file=.env.local scripts/verify/payments-rls-check.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("MISSING_ENV: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
console.log(`project url: ${url}`);

const sb = createClient(url, key, { auth: { persistSession: false } });
const log = (k, v) => console.log(`${k.padEnd(46)} ${String(v)}`);

/* ------------------------------------------------------------------ */
console.log("=== A. migration 0023 applied — SECURITY DEFINER function ===");
let fnState = "NOT FOUND — 0023 not applied";
{
  const { data, error } = await sb.rpc("finalize_payment_ledger", {
    p_payment_id: "00000000-0000-0000-0000-000000000000",
    p_user_id: "00000000-0000-0000-0000-000000000000",
    p_business_id: "00000000-0000-0000-0000-000000000000",
    p_currency: "MAD",
    p_amount_cents: 1,
    p_reference: "__probe__",
  });
  // Any of these outcomes prove the function exists; we only care that it is
  // reachable (vs. PGRST202 "function not found").
  if (error && /PGRST202|Could not find the function/i.test(error.message || "")) {
    fnState = "NOT FOUND — 0023 not applied";
  } else if (error && /admin only/i.test(error.message || "")) {
    fnState = "present + admin-gated (service role → admin) ✓";
  } else {
    fnState = `present — unexpected probe result: ${JSON.stringify({ data, error }).slice(0, 140)}`;
  }
}
log("finalize_payment_ledger function", fnState);

/* ------------------------------------------------------------------ */
console.log("\n=== B. RLS policies intact (general customer paths unchanged) ===");
const wantPolicies = [
  ["transactions", "transactions_insert_own"],
  ["transactions", "transactions_select_owner"],
  ["coupon_usage", "cu_insert_own"],
  ["coupon_usage", "cu_select_owner"],
];
for (const [table, pol] of wantPolicies) {
  const { data, error } = await sb.from("pg_policies").select("polname,cmd").eq("schemaname", "public").eq("tablename", table).eq("polname", pol);
  log(`policy ${table}.${pol}`, error ? `err ${(error.message || "").slice(0, 90)}` : (data && data.length ? `present (${data[0].cmd}) ✓` : "MISSING"));
}

/* ------------------------------------------------------------------ */
console.log("\n=== C. function execute grants ===");
const { data: grants, error: grantErr } = await sb
  .from("information_schema.routine_privileges")
  .select("grantee,privilege_type")
  .eq("routine_name", "finalize_payment_ledger")
  .eq("privilege_type", "EXECUTE");
if (grantErr) log("grant rows", `err ${(grantErr.message || "").slice(0, 90)}`);
else {
  const names = (grants || []).map((g) => g.grantee);
  log("execute granted to", names.length ? names.join(", ") : "nobody");
  log("PUBLIC excluded", names.includes("PUBLIC") ? "NO — insecure ✗" : "yes ✓");
}

/* ------------------------------------------------------------------ */
console.log("\n=== D. runtime scenario matrix (needs live non-admin session) ===");
const scenarios = [
  ["customer inserts own transaction", "NOT EXECUTED"],
  ["customer inserts cross-user transaction (must be BLOCKED)", "NOT EXECUTED"],
  ["customer inserts own coupon_usage", "NOT EXECUTED"],
  ["customer calls finalize_payment_ledger directly (must be BLOCKED)", "NOT EXECUTED"],
  ["admin finalizes: transaction + coupon_usage written", "NOT EXECUTED"],
  ["admin finalizes same payment twice (idempotent, single tx)", "NOT EXECUTED"],
  ["admin attributes row to non-owner user (must be BLOCKED)", "NOT EXECUTED"],
  ["anonymous calls finalize_payment_ledger (must be BLOCKED)", "NOT EXECUTED"],
];
for (const [name, status] of scenarios) log(name, status);

console.log("\nDONE");
if (fnState.startsWith("NOT FOUND")) process.exitCode = 2;
