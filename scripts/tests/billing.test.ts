/**
 * Billing pure-logic test suite: subscription state derivation and money helpers.
 * Run: node scripts/tests/billing.test.ts
 */

import { run, finish, assertEqual } from "./suite.ts";
import {
  deriveSubscriptionState,
  isEntitled,
} from "../../lib/billing/subscription-state.ts";
import {
  intervalMonths,
  addInterval,
  centsToAmount,
} from "../../lib/billing/money.ts";

const FIXED_NOW = new Date("2026-01-15T00:00:00.000Z");

await run("state: null row -> none", () => {
  assertEqual(deriveSubscriptionState(null, FIXED_NOW), "none");
  assertEqual(deriveSubscriptionState(undefined, FIXED_NOW), "none");
});

await run("state: active row -> active + entitled", () => {
  const sub = { status: "active", expires_at: "2026-06-01T00:00:00.000Z" };
  assertEqual(deriveSubscriptionState(sub, FIXED_NOW), "active");
  assertEqual(isEntitled("active"), true);
});

await run("state: lifetime never expires", () => {
  const sub = { status: "active", lifetime: true, expires_at: "2026-01-01T00:00:00.000Z" };
  assertEqual(deriveSubscriptionState(sub, FIXED_NOW), "active");
});

await run("state: future cancel_at -> cancelling but entitled", () => {
  const sub = { status: "active", cancel_at: "2026-02-01T00:00:00.000Z" };
  assertEqual(deriveSubscriptionState(sub, FIXED_NOW), "cancelling");
  assertEqual(isEntitled("cancelling"), true);
});

await run("state: past cancel_at -> cancelled, not entitled", () => {
  const sub = { status: "active", cancel_at: "2026-01-01T00:00:00.000Z" };
  assertEqual(deriveSubscriptionState(sub, FIXED_NOW), "cancelled");
  assertEqual(isEntitled("cancelled"), false);
});

await run("state: cancelled_at set -> cancelled regardless of status", () => {
  const sub = { status: "active", cancelled_at: "2026-01-01T00:00:00.000Z" };
  assertEqual(deriveSubscriptionState(sub, FIXED_NOW), "cancelled");
});

await run("state: paused -> paused", () => {
  const sub = { status: "paused", paused_at: "2026-01-10T00:00:00.000Z" };
  assertEqual(deriveSubscriptionState(sub, FIXED_NOW), "paused");
});

await run("state: expired when period over without renewal", () => {
  const sub = { status: "active", expires_at: "2026-01-01T00:00:00.000Z" };
  assertEqual(deriveSubscriptionState(sub, FIXED_NOW), "expired");
});

await run("state: expired but next_billing_at in future -> active", () => {
  const sub = {
    status: "active",
    expires_at: "2026-01-01T00:00:00.000Z",
    next_billing_at: "2026-02-01T00:00:00.000Z",
  };
  assertEqual(deriveSubscriptionState(sub, FIXED_NOW), "active");
});

await run("state: trialing + entitled, free + not entitled", () => {
  assertEqual(deriveSubscriptionState({ status: "trialing" }, FIXED_NOW), "trialing");
  assertEqual(isEntitled("trialing"), true);
  assertEqual(deriveSubscriptionState({ status: "free" }, FIXED_NOW), "free");
  assertEqual(isEntitled("free"), false);
});

await run("state: superseded terminal", () => {
  assertEqual(deriveSubscriptionState({ status: "superseded" }, FIXED_NOW), "superseded");
});

await run("money: intervalMonths", () => {
  assertEqual(intervalMonths("monthly"), 1);
  assertEqual(intervalMonths("quarterly"), 3);
  assertEqual(intervalMonths("yearly"), 12);
  assertEqual(intervalMonths("lifetime"), null);
});

await run("money: addInterval shifts UTC month", () => {
  const from = new Date("2026-01-15T00:00:00.000Z");
  assertEqual(addInterval("monthly", from).toISOString(), "2026-02-15T00:00:00.000Z");
  assertEqual(addInterval("quarterly", from).toISOString(), "2026-04-15T00:00:00.000Z");
  assertEqual(addInterval("yearly", from).toISOString(), "2027-01-15T00:00:00.000Z");
});

await run("money: lifetime far-future date", () => {
  const d = addInterval("lifetime", new Date("2026-01-15T00:00:00.000Z"));
  assertEqual(d.getTime(), 8640000000000000);
});

await run("money: centsToAmount", () => {
  assertEqual(centsToAmount(19900), 199);
  assertEqual(centsToAmount(199), 1.99);
  assertEqual(centsToAmount(0), 0);
});

await finish();
