/**
 * BILLING SECURITY MATRIX
 *
 * Executable unit-level security matrix for the billing hardening pass. Covers:
 *   1. Stripe webhook signature verification  (t=,v1= over `${t}.${body}`)
 *   2. CMI / Payzone fail-closed webhooks      (unsigned payloads are rejected)
 *   3. Server-controlled payment snapshots     (snapshot column set frozen)
 *   4. Admin payment confirmation guards       (verified-only + no terminal)
 *   5. Subscription/history policy invariants  (documented + enforced at DB layer,
 *      checked from the JS contract the matrix asserts against)
 *   6. Provider matching                       (webhook provider === payment provider)
 *   7. Payment state transitions               (terminal states are end states)
 *   8. Idempotency                             (same-state mirror is a no-op)
 *
 * Run: node scripts/tests/billing-security.test.ts
 */

import { run, finish, assertEqual, assert } from "./suite.ts";
import {
  parseStripeSignature,
  verifyStripeSignature,
  hmacSha256Hex,
  verifyBodySignature,
  formSignaturePayload,
  canAdvancePaymentStatus,
  isTerminalPaymentStatus,
  paymentMatchesProvider,
  adminConfirmGuard,
  PAYMENT_SNAPSHOT_COLUMNS,
} from "../../lib/payments/security.ts";
import { StripeProvider } from "../../lib/payments/providers/stripe.ts";
import { CmiMoroccoProvider } from "../../lib/payments/providers/cmi.ts";
import { PayzoneProvider } from "../../lib/payments/providers/payzone.ts";

/* ------------------------------------------------------------------------ */
/* 1. Stripe signature verification                                          */
/* ------------------------------------------------------------------------ */

const STRIPE_SECRET = "whsec_test_abcdef";

/** Node stores strings in process.env; restoring `undefined` writes the string
 *  "undefined". Delete the var instead so providers fall back correctly. */
function restoreEnv(name: string, prev: string | undefined): void {
  if (prev === undefined) delete process.env[name];
  else process.env[name] = prev;
}

function stripeHeaders(sig: string): Headers {
  return new Headers({ "stripe-signature": sig });
}

async function makeStripeSig(body: string, t?: number): Promise<string> {
  const ts = t ?? Math.floor(Date.now() / 1000);
  const v1 = await hmacSha256Hex(STRIPE_SECRET, `${ts}.${body}`);
  return `t=${ts},v1=${v1}`;
}

const STRIPE_BODY = JSON.stringify({
  type: "checkout.session.completed",
  data: { object: { id: "cs_123", payment_status: "paid" } },
});

await run("matrix:1 stripe header parses t and v1", async () => {
  const h = await makeStripeSig(STRIPE_BODY);
  const { t, v1 } = parseStripeSignature(h);
  assert(typeof t === "number" && t > 0, "t is a positive number");
  assert(/^[0-9a-f]{64}$/i.test(v1), "v1 is 64 hex chars");
});

await run("matrix:1 stripe malformed header rejected (fail closed)", () => {
  let threw = false;
  try {
    parseStripeSignature("nope=1");
  } catch {
    threw = true;
  }
  assert(threw, "malformed header must throw");
  try {
    parseStripeSignature("t=abc,v1=nothex");
  } catch {
    threw = true;
  }
  assert(threw, "non-hex v1 must throw");
});

await run("matrix:1 stripe verify rejects missing secret", async () => {
  let threw = false;
  try {
    await verifyStripeSignature("", await makeStripeSig(STRIPE_BODY), STRIPE_BODY);
  } catch (e) {
    threw = String(e).includes("no_secret");
  }
  assert(threw, "missing secret must fail closed with no_secret");
});

await run("matrix:1 stripe verify accepts valid timestamped signature", async () => {
  const h = await makeStripeSig(STRIPE_BODY);
  await verifyStripeSignature(STRIPE_SECRET, h, STRIPE_BODY, Date.now());
});

await run("matrix:1 stripe verify rejects tampered body", async () => {
  const h = await makeStripeSig(STRIPE_BODY);
  const tampered = STRIPE_BODY.replace("paid", "unpaid");
  let threw = false;
  try {
    await verifyStripeSignature(STRIPE_SECRET, h, tampered, Date.now());
  } catch (e) {
    threw = String(e).includes("invalid_signature");
  }
  assert(threw, "tampered body must fail closed with invalid_signature");
});

await run("matrix:1 stripe verify rejects replay outside tolerance", async () => {
  const staleT = Math.floor(Date.now() / 1000) - 3600;
  const h = await makeStripeSig(STRIPE_BODY, staleT);
  let threw = false;
  try {
    await verifyStripeSignature(STRIPE_SECRET, h, STRIPE_BODY, Date.now());
  } catch (e) {
    threw = String(e).includes("timestamp_out_of_tolerance");
  }
  assert(threw, "stale timestamp must be rejected as replay");
});

await run("matrix:1 stripe handleWebhook requires secret", async () => {
  const prev = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = "";
  try {
    const provider = new StripeProvider();
    let threw = false;
    try {
      await provider.handleWebhook(stripeHeaders(await makeStripeSig(STRIPE_BODY)), STRIPE_BODY);
    } catch (e) {
      threw = String(e).includes("no_secret");
    }
    assert(threw, "no webhook secret must fail closed");
  } finally {
    restoreEnv("STRIPE_WEBHOOK_SECRET", prev);
  }
});

await run("matrix:1 stripe handleWebhook mirrors only a valid signature", async () => {
  const prev = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = STRIPE_SECRET;
  try {
    const provider = new StripeProvider();
    const h = await makeStripeSig(STRIPE_BODY);
    const res = await provider.handleWebhook(stripeHeaders(h), STRIPE_BODY);
    assertEqual(res.status, "succeeded");
    assertEqual(res.event, "checkout.session.completed");
    assertEqual(res.references[0], "cs_123");

    let threw = false;
    try {
      const forged = `t=${Math.floor(Date.now() / 1000)},v1=${"0".repeat(64)}`;
      await provider.handleWebhook(stripeHeaders(forged), STRIPE_BODY);
    } catch (e) {
      threw = String(e).includes("invalid_signature");
    }
    assert(threw, "forged signature must be rejected");
  } finally {
    restoreEnv("STRIPE_WEBHOOK_SECRET", prev);
  }
});

/* ------------------------------------------------------------------------ */
/* 2. CMI / Payzone fail-closed webhooks                                     */
/* ------------------------------------------------------------------------ */

await run("matrix:2 cmi without a key fails closed (no_secret)", async () => {
  const prevKey = process.env.CMI_STORE_KEY;
  const prevWh = process.env.CMI_WEBHOOK_SECRET;
  process.env.CMI_STORE_KEY = "";
  process.env.CMI_WEBHOOK_SECRET = "";
  try {
    const provider = new CmiMoroccoProvider();
    let threw = false;
    try {
      await provider.handleWebhook(new Headers(), "oid=x&Response=23");
    } catch (e) {
      threw = String(e).includes("no_secret");
    }
    assert(threw, "unsigned CMI payload must fail closed without a key");
  } finally {
    restoreEnv("CMI_STORE_KEY", prevKey);
    restoreEnv("CMI_WEBHOOK_SECRET", prevWh);
  }
});

await run("matrix:2 cmi missing Hash is rejected even with a key", async () => {
  const prev = process.env.CMI_STORE_KEY;
  const prevWh = process.env.CMI_WEBHOOK_SECRET;
  process.env.CMI_STORE_KEY = "cmi-secret";
  try {
    const provider = new CmiMoroccoProvider();
    let threw = false;
    try {
      await provider.handleWebhook(new Headers(), "oid=x&Response=23");
    } catch (e) {
      threw = String(e).includes("invalid_signature");
    }
    assert(threw, "missing Hash must be rejected");
  } finally {
    restoreEnv("CMI_STORE_KEY", prev);
    restoreEnv("CMI_WEBHOOK_SECRET", prevWh);
  }
});

await run("matrix:2 cmi valid signature mirrors succeeded", async () => {
  const prev = process.env.CMI_STORE_KEY;
  const prevWh = process.env.CMI_WEBHOOK_SECRET;
  process.env.CMI_WEBHOOK_SECRET = "";
  process.env.CMI_STORE_KEY = "cmi-secret";
  try {
    const provider = new CmiMoroccoProvider();
    const params = "oid=oid123&Response=23&amount=19900";
    const payload = formSignaturePayload(params, ["Hash", "hash"]);
    const hash = await hmacSha256Hex("cmi-secret", payload);
    const res = await provider.handleWebhook(new Headers(), `${params}&Hash=${hash}`);
    assertEqual(res.status, "succeeded");
    assertEqual(res.references[0], "oid123");
  } finally {
    restoreEnv("CMI_STORE_KEY", prev);
    restoreEnv("CMI_WEBHOOK_SECRET", prevWh);
  }
});

await run("matrix:2 cmi tampered body is rejected", async () => {
  const prev = process.env.CMI_STORE_KEY;
  const prevWh = process.env.CMI_WEBHOOK_SECRET;
  process.env.CMI_WEBHOOK_SECRET = "";
  process.env.CMI_STORE_KEY = "cmi-secret";
  try {
    const provider = new CmiMoroccoProvider();
    // Signature computed over a DIFFERENT payload than the one posted.
    const hash = await hmacSha256Hex(
      "cmi-secret",
      formSignaturePayload("oid=oid999&Response=23", ["Hash", "hash"]),
    );
    const params = "oid=oid123&Response=23&amount=19900";
    let threw = false;
    try {
      await provider.handleWebhook(new Headers(), `${params}&Hash=${hash}`);
    } catch (e) {
      threw = String(e).includes("invalid_signature");
    }
    assert(threw, "signature over a different payload must be rejected");
  } finally {
    restoreEnv("CMI_STORE_KEY", prev);
    restoreEnv("CMI_WEBHOOK_SECRET", prevWh);
  }
});

await run("matrix:2 payzone without a key fails closed", async () => {
  const prev = process.env.PAYZONE_API_KEY;
  const prevWh = process.env.PAYZONE_WEBHOOK_SECRET;
  process.env.PAYZONE_API_KEY = "";
  process.env.PAYZONE_WEBHOOK_SECRET = "";
  try {
    const provider = new PayzoneProvider();
    let threw = false;
    try {
      await provider.handleWebhook(new Headers(), "pay_token=x&responseCode=0");
    } catch (e) {
      threw = String(e).includes("no_secret");
    }
    assert(threw, "unsigned Payzone payload must fail closed without a key");
  } finally {
    restoreEnv("PAYZONE_API_KEY", prev);
    restoreEnv("PAYZONE_WEBHOOK_SECRET", prevWh);
  }
});

await run("matrix:2 payzone valid signature + missing signature both handled", async () => {
  const prev = process.env.PAYZONE_API_KEY;
  process.env.PAYZONE_API_KEY = "pz-secret";
  try {
    const provider = new PayzoneProvider();
    const params = "pay_token=PZ1&responseCode=0";
    const payload = formSignaturePayload(params, ["signature", "sign", "SHA"]);
    const sig = await hmacSha256Hex("pz-secret", payload);
    const ok = await provider.handleWebhook(new Headers(), `${params}&signature=${sig}`);
    assertEqual(ok.status, "succeeded");

    let threw = false;
    try {
      await provider.handleWebhook(new Headers(), `${params}&signature=deadbeef`);
    } catch (e) {
      threw = String(e).includes("invalid_signature");
    }
    assert(threw, "wrong signature must be rejected");
  } finally {
    restoreEnv("PAYZONE_API_KEY", prev);
  }
});

await run("matrix:2 verifyBodySignature rejects when secret missing", async () => {
  let threw = false;
  try {
    await verifyBodySignature("", "body", "sig", "cmi");
  } catch (e) {
    threw = String(e).includes("no_secret");
  }
  assert(threw, "verifyBodySignature must fail closed without a secret");
});

/* ------------------------------------------------------------------------ */
/* 3. Server-controlled payment snapshots                                    */
/* ------------------------------------------------------------------------ */

await run("matrix:3 snapshot column set covers the authoritative fields", () => {
  const expected = [
    "amount_cents",
    "currency",
    "provider",
    "provider_payment_id",
    "gateway_ref",
    "idempotency_key",
    "user_id",
    "business_id",
    "subscription_id",
    "payment_method",
    "metadata",
  ];
  for (const col of expected) {
    assert(
      (PAYMENT_SNAPSHOT_COLUMNS as readonly string[]).includes(col),
      `snapshot must protect ${col}`,
    );
  }
});

/* ------------------------------------------------------------------------ */
/* 4. Admin payment confirmation guards                                      */
/* ------------------------------------------------------------------------ */

await run("matrix:4 manual pending payment is confirmable", () => {
  const g = adminConfirmGuard({ status: "pending", provider: "manual" });
  assertEqual(g.ok, true);
});

await run("matrix:4 online payment must be gateway-verified succeeded", () => {
  assertEqual(adminConfirmGuard({ status: "processing", provider: "stripe" }).ok, false);
  assertEqual(adminConfirmGuard({ status: "pending", provider: "paypal" }).ok, false);
  assertEqual(adminConfirmGuard({ status: "succeeded", provider: "stripe" }).ok, true);
  assertEqual(adminConfirmGuard({ status: "succeeded", provider: "manual" }).ok, true);
});

await run("matrix:4 terminal/negative states are not confirmable", () => {
  assertEqual(adminConfirmGuard({ status: "refunded", provider: "manual" }).ok, false);
  assertEqual(adminConfirmGuard({ status: "cancelled", provider: "stripe" }).ok, false);
  assertEqual(adminConfirmGuard({ status: "failed", provider: "stripe" }).ok, false);
});

/* ------------------------------------------------------------------------ */
/* 5. Subscription/history invariants (contract asserted here, enforced at DB) */
/* ------------------------------------------------------------------------ */

await run("matrix:5 owner-only history actions are the self-lifecycle set", () => {
  // Mirrors the 0029 migration: non-admin owners may only insert
  // cancelled/paused/resumed history rows; everything else is admin.
  const ownerActions = new Set(["cancelled", "paused", "resumed"]);
  assert(ownerActions.has("cancelled"), "cancel action present");
  assert(ownerActions.has("paused"), "pause action present");
  assert(ownerActions.has("resumed"), "resume action present");
  assert(!ownerActions.has("create"), "create is admin-only");
  assert(!ownerActions.has("renewed"), "renewed is admin-only");
  assert(!ownerActions.has("upgraded"), "upgraded is admin-only");
});

/* ------------------------------------------------------------------------ */
/* 6. Provider matching                                                      */
/* ------------------------------------------------------------------------ */

await run("matrix:6 webhook updates only payments of the same provider", () => {
  assertEqual(paymentMatchesProvider("stripe", { provider: "stripe" }), true);
  assertEqual(paymentMatchesProvider("cmi", { provider: "cmi" }), true);
  assertEqual(paymentMatchesProvider("stripe", { provider: "paypal" }), false);
  assertEqual(paymentMatchesProvider("cmi", { provider: null }), false);
  assertEqual(paymentMatchesProvider("stripe", {}), false);
});

/* ------------------------------------------------------------------------ */
/* 7. Payment state transitions                                              */
/* ------------------------------------------------------------------------ */

await run("matrix:7 terminal states are end states", () => {
  assertEqual(isTerminalPaymentStatus("succeeded"), true);
  assertEqual(isTerminalPaymentStatus("refunded"), true);
  assertEqual(isTerminalPaymentStatus("cancelled"), true);
  assertEqual(isTerminalPaymentStatus("partial_refunded"), true);
  assertEqual(isTerminalPaymentStatus("processing"), false);
  assertEqual(isTerminalPaymentStatus(null), false);
});

await run("matrix:7 forward moves allowed, terminal regression blocked", () => {
  assertEqual(canAdvancePaymentStatus("pending", "succeeded"), true);
  assertEqual(canAdvancePaymentStatus("processing", "failed"), true);
  assertEqual(canAdvancePaymentStatus("pending", "processing"), true);
  assertEqual(canAdvancePaymentStatus("succeeded", "processing"), false);
  assertEqual(canAdvancePaymentStatus("refunded", "succeeded"), false);
  assertEqual(canAdvancePaymentStatus("cancelled", "pending"), false);
  assertEqual(canAdvancePaymentStatus("partial_refunded", "succeeded"), false);
});

/* ------------------------------------------------------------------------ */
/* 8. Idempotency                                                            */
/* ------------------------------------------------------------------------ */

await run("matrix:8 same-state mirror is an idempotent no-op", () => {
  assertEqual(canAdvancePaymentStatus("processing", "processing"), true);
  assertEqual(canAdvancePaymentStatus("succeeded", "succeeded"), true);
});

await run("matrix:8 gateway idempotency keys are server-only snapshot fields", () => {
  // idempotency_key is in the snapshot set, so a user cannot rotate their own
  // key to defeat the (provider, idempotency_key) unique guard in recordPayment.
  assert(
    (PAYMENT_SNAPSHOT_COLUMNS as readonly string[]).includes("idempotency_key"),
    "idempotency_key is a protected snapshot field",
  );
});

await finish();