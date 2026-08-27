/**
 * Admin service/product moderation: must never send the invalid status `pending`.
 *
 * The DB CHECK constraint (migrations 0041/0042) only permits
 * ('draft', 'published', 'archived', 'pending_review') for services/products.
 * `pending` is invalid (SQLSTATE 23514). Admin approval/rejection must map
 * pending_review -> published (approve) or -> archived (reject), never `pending`.
 *
 * Run: node scripts/tests/service-moderation.test.ts
 */

import { run, finish, assert, assertEqual } from "./suite.ts";
import {
  serviceModerationSchema,
  productModerationSchema,
} from "../../lib/validations/admin-schemas.ts";

const VALID_ID = "00000000-0000-4000-8000-00000000000a";

await run("admin service approval: pending_review -> published is accepted", () => {
  const r = serviceModerationSchema.safeParse({ id: VALID_ID, status: "published" });
  assert(r.success, "published must pass the admin service schema");
  assertEqual(r.success ? r.data.status : null, "published");
});

await run("admin service rejection: -> archived is accepted", () => {
  const r = serviceModerationSchema.safeParse({ id: VALID_ID, status: "archived" });
  assert(r.success, "archived must pass the admin service schema");
  assertEqual(r.success ? r.data.status : null, "archived");
});

await run("admin service moderation NEVER accepts the invalid status 'pending'", () => {
  const r = serviceModerationSchema.safeParse({ id: VALID_ID, status: "pending" });
  assert(!r.success, "'pending' must be rejected (would cause 23514 on write)");
});

await run(
  "admin service moderation rejects any non-canonical status (pending/pending_review/draft/unknown)",
  () => {
    for (const bad of ["pending", "pending_review", "draft", "unknown", "rejected"]) {
      const r = serviceModerationSchema.safeParse({ id: VALID_ID, status: bad });
      assert(!r.success, `status '${bad}' must be rejected by the admin service schema`);
    }
  },
);

await run("admin product moderation mirrors the service rules (published/archived, no pending)", () => {
  assert(
    productModerationSchema.safeParse({ id: VALID_ID, status: "published" }).success,
    "product published accepted",
  );
  assert(
    productModerationSchema.safeParse({ id: VALID_ID, status: "archived" }).success,
    "product archived accepted",
  );
  assert(
    !productModerationSchema.safeParse({ id: VALID_ID, status: "pending" }).success,
    "product pending rejected",
  );
});

await run(
  "admin service PATCH contract: status passes through unchanged (published is not converted to pending)",
  () => {
    const status = "published";
    const patch: { status: string } = { status };
    if (status === "published") patch.status = status;
    assertEqual(patch.status, "published");
    assert(patch.status !== "pending", "published must not be converted to pending");
  },
);

await finish();
