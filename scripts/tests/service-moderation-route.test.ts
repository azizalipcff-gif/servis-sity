/**
 * Regression test for the admin services PATCH fix:
 * the service id arrives in the URL query string (?id=<uuid>) while status
 * (and optional status_note) arrive in the JSON body. The route must merge
 * the query id into the validated object.
 *
 * Run: node scripts/tests/service-moderation-route.test.ts
 */

import { run, finish, assert } from "./suite.ts";
import { serviceModerationSchema } from "../../lib/validations/admin-schemas.ts";

const VALID_ID = "00000000-0000-4000-8000-00000000000a";

// Mirrors app/api/admin/services/route.ts: merge query id with JSON body.
const validateRouteInput = (queryId: string | null, body: unknown) =>
  serviceModerationSchema.safeParse({ ...(body as Record<string, unknown> | null ?? {}), id: queryId });

await run("approve: query id + body status=published is accepted", () => {
  assert(validateRouteInput(VALID_ID, { status: "published" }).success, "approve must pass");
});

await run("reject: query id + body status=archived is accepted", () => {
  assert(validateRouteInput(VALID_ID, { status: "archived" }).success, "reject must pass");
});

await run("missing query id is rejected safely (no DB call, 400)", () => {
  assert(!validateRouteInput(null, { status: "published" }).success, "missing id must fail");
});

await run("invalid (non-uuid) query id is rejected safely (no DB call, 400)", () => {
  assert(!validateRouteInput("not-a-uuid", { status: "published" }).success, "invalid id must fail");
});

await run("legacy invalid status 'pending' is still rejected", () => {
  assert(!validateRouteInput(VALID_ID, { status: "pending" }).success, "pending must fail");
});

await finish();
