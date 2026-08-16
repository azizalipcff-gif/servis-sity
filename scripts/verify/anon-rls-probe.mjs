/**
 * PHASE 1 — live read-only security probe using the ANON key.
 * Verifies the security boundary from an unauthenticated client:
 *   - anon cannot invoke the SECURITY DEFINER functions
 *   - anon cannot insert into transactions / coupon_usage / refunds
 * All calls are expected to be REJECTED, so no rows are written.
 *
 * Run: node --env-file=.env.local scripts/verify/anon-rls-probe.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("MISSING_ENV: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const anon = createClient(url, key, { auth: { persistSession: false } });
const zero = "00000000-0000-0000-0000-000000000000";
const log = (k, v) => console.log(k.padEnd(52), v);

// 1. anonymous calls finalize_payment_ledger -> must be BLOCKED
{
  const { data, error } = await anon.rpc("finalize_payment_ledger", {
    p_payment_id: zero, p_user_id: zero, p_business_id: zero,
    p_currency: "MAD", p_amount_cents: 1, p_reference: "__anon__",
  });
  const msg = error?.message || JSON.stringify(data);
  log("anon -> finalize_payment_ledger",
    /admin only|permission|policy|not found|PGRST202/i.test(msg) ? `BLOCKED (${msg.slice(0, 80)})` : `UNEXPECTED: ${msg.slice(0, 120)}`);
}

// 2. anonymous calls finalize_payment_refund -> must be BLOCKED
{
  const { data, error } = await anon.rpc("finalize_payment_refund", { p_payment_id: zero });
  const msg = error?.message || JSON.stringify(data);
  log("anon -> finalize_payment_refund",
    /admin only|permission|policy|not found|PGRST202/i.test(msg) ? `BLOCKED (${msg.slice(0, 80)})` : `UNEXPECTED: ${msg.slice(0, 120)}`);
}

// 3. anonymous inserts a cross-user transaction -> must be BLOCKED
{
  const { data, error } = await anon.from("transactions").insert({
    business_id: zero, user_id: zero, payment_id: zero, type: "payment",
    amount_cents: 1, currency: "MAD", status: "completed", reference: "__anon__",
  });
  const msg = error?.message || JSON.stringify(data);
  log("anon insert transactions",
    /policy|permission|violates|row-level/i.test(msg) ? `BLOCKED (${msg.slice(0, 80)})` : `UNEXPECTED: ${msg.slice(0, 120)}`);
}

// 4. anonymous inserts coupon_usage -> must be BLOCKED
{
  const { data, error } = await anon.from("coupon_usage").insert({ coupon_id: zero, user_id: zero });
  const msg = error?.message || JSON.stringify(data);
  log("anon insert coupon_usage",
    /policy|permission|violates|row-level/i.test(msg) ? `BLOCKED (${msg.slice(0, 80)})` : `UNEXPECTED: ${msg.slice(0, 120)}`);
}

// 5. anonymous inserts refunds -> must be BLOCKED
{
  const { data, error } = await anon.from("refunds").insert({
    payment_id: zero, user_id: zero, amount_cents: 1, currency: "MAD", status: "pending",
  });
  const msg = error?.message || JSON.stringify(data);
  log("anon insert refunds",
    /policy|permission|violates|row-level/i.test(msg) ? `BLOCKED (${msg.slice(0, 80)})` : `UNEXPECTED: ${msg.slice(0, 120)}`);
}

console.log("DONE");
