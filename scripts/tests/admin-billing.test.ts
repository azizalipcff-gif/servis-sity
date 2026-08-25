/**
 * Admin user-management + billing security regression suite.
 *
 * Covers the server-side validation schemas that guard the client/server
 * boundary for: manual subscription grant (P1.4), coupon mutation (P1.4),
 * and user patch (P1.2). Authorization/audit behavior is covered by the
 * e2e suite against a live Supabase project.
 *
 * Run: node scripts/tests/admin-billing.test.ts
 */

import { run, finish, assert, assertEqual } from "./suite.ts";
import {
  subscriptionGrantSchema,
  couponCreateSchema,
  userPatchSchema,
} from "../../lib/validations/admin-schemas.ts";

await run("subscriptionGrant: valid grant", () => {
  const r = subscriptionGrantSchema.safeParse({
    business_id: "11111111-1111-1111-1111-111111111111",
    plan_key: "premium",
    interval: "monthly",
    mode: "grant",
  });
  assert(r.success, "expected valid grant to pass");
});

await run("subscriptionGrant: invalid plan rejected", () => {
  const r = subscriptionGrantSchema.safeParse({
    business_id: "11111111-1111-1111-1111-111111111111",
    plan_key: "diamond",
    interval: "monthly",
  });
  assert(!r.success, "expected invalid plan_key to fail");
});

await run("subscriptionGrant: invalid interval rejected", () => {
  const r = subscriptionGrantSchema.safeParse({
    business_id: "11111111-1111-1111-1111-111111111111",
    plan_key: "premium",
    interval: "fortnight",
  });
  assert(!r.success, "expected invalid interval to fail");
});

await run("subscriptionGrant: invalid business id rejected", () => {
  const r = subscriptionGrantSchema.safeParse({
    business_id: "not-a-uuid",
    plan_key: "premium",
    interval: "monthly",
  });
  assert(!r.success, "expected non-uuid business_id to fail");
});

await run("subscriptionGrant: manual_billing negative amount rejected", () => {
  const r = subscriptionGrantSchema.safeParse({
    business_id: "11111111-1111-1111-1111-111111111111",
    plan_key: "premium",
    interval: "monthly",
    mode: "manual_billing",
    amount_cents: -50,
  });
  assert(!r.success, "expected negative amount to fail");
});

await run("couponCreate: valid", () => {
  const r = couponCreateSchema.safeParse({
    code: "WELCOME10",
    type: "percent",
    value: 10,
    applies_to: "any",
  });
  assert(r.success, "expected valid coupon to pass");
});

await run("couponCreate: negative value rejected", () => {
  const r = couponCreateSchema.safeParse({
    code: "BAD",
    type: "percent",
    value: -5,
  });
  assert(!r.success, "expected negative value to fail");
});

await run("couponCreate: invalid expiry rejected", () => {
  const r = couponCreateSchema.safeParse({
    code: "BAD",
    type: "fixed",
    value: 5,
    expires_at: "not-a-date",
  });
  assert(!r.success, "expected invalid date to fail");
});

await run("userPatch: ban action valid", () => {
  const r = userPatchSchema.safeParse({
    id: "22222222-2222-2222-2222-222222222222",
    banned: true,
  });
  assert(r.success, "expected ban patch to pass");
  assertEqual(r.success && r.data.banned, true);
});

await run("userPatch: empty patch rejected", () => {
  const r = userPatchSchema.safeParse({
    id: "22222222-2222-2222-2222-222222222222",
  });
  assert(!r.success, "expected empty patch to fail");
});

await finish();
