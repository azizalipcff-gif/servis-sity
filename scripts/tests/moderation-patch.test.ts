/**
 * Regression tests for admin service/product moderation PATCH.
 *
 * Fix: the DB UPDATE must write only `{ status }`. `status_note` is accepted
 * in the request (and preserved in audit_logs metadata) but is NOT sent to the
 * `services`/`products` tables, which lack that column in the live DB.
 *
 * Run: node scripts/tests/moderation-patch.test.ts
 */

import { run, finish, assert, assertEqual } from "./suite.ts";
import { buildModerationPatch } from "../../lib/moderation.ts";
import {
  serviceModerationSchema,
  productModerationSchema,
} from "../../lib/validations/admin-schemas.ts";

const VALID_ID = "00000000-0000-4000-8000-00000000000a";
const REASON = "does not meet quality guidelines";

// Mirror the route: merge the query id into the JSON body before validating.
const validateService = (queryId: string | null, body: unknown) =>
  serviceModerationSchema.safeParse({ ...(body as Record<string, unknown> | null ?? {}), id: queryId });
const validateProduct = (queryId: string | null, body: unknown) =>
  productModerationSchema.safeParse({ ...(body as Record<string, unknown> | null ?? {}), id: queryId });

// --- The DB patch sends only `status` -------------------------------------
await run("service moderation DB patch contains only status", () => {
  const patch = buildModerationPatch("published");
  assertEqual(Object.keys(patch).length, 1);
  assertEqual(patch.status, "published");
  assert(!("status_note" in patch), "status_note must NOT be in the DB patch");
});

await run("product moderation DB patch contains only status", () => {
  const patch = buildModerationPatch("archived");
  assertEqual(Object.keys(patch).length, 1);
  assertEqual(patch.status, "archived");
  assert(!("status_note" in patch), "status_note must NOT be in the DB patch");
});

// --- status_note is still accepted as request input (for audit) -----------
await run("service: status_note accepted as input and available for audit", () => {
  const r = validateService(VALID_ID, { status: "archived", status_note: REASON });
  assert(r.success, "reject with status_note must pass validation");
  assertEqual(r.success ? r.data.status_note : null, REASON);
});

await run("product: status_note accepted as input and available for audit", () => {
  const r = validateProduct(VALID_ID, { status: "archived", status_note: REASON });
  assert(r.success, "reject with status_note must pass validation");
  assertEqual(r.success ? r.data.status_note : null, REASON);
});

// --- invalid statuses ------------------------------------------------------
await run("service: legacy 'pending' is rejected", () => {
  assert(!validateService(VALID_ID, { status: "pending" }).success, "pending must be rejected");
});

await run("product: legacy 'pending' is rejected", () => {
  assert(!validateProduct(VALID_ID, { status: "pending" }).success, "pending must be rejected");
});

await run("service: published and archived remain valid", () => {
  assert(validateService(VALID_ID, { status: "published" }).success, "published must be valid");
  assert(validateService(VALID_ID, { status: "archived" }).success, "archived must be valid");
});

await run("product: published and archived remain valid", () => {
  assert(validateProduct(VALID_ID, { status: "published" }).success, "published must be valid");
  assert(validateProduct(VALID_ID, { status: "archived" }).success, "archived must be valid");
});

// --- id validation (from the query string) --------------------------------
await run("service: missing query id is rejected", () => {
  assert(!validateService(null, { status: "published" }).success, "missing id must fail");
});

await run("service: invalid (non-uuid) query id is rejected", () => {
  assert(!validateService("not-a-uuid", { status: "published" }).success, "invalid id must fail");
});

await run("product: missing query id is rejected", () => {
  assert(!validateProduct(null, { status: "published" }).success, "missing id must fail");
});

await run("product: invalid (non-uuid) query id is rejected", () => {
  assert(!validateProduct("not-a-uuid", { status: "published" }).success, "invalid id must fail");
});

await finish();
