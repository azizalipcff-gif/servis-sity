/**
 * Moderation status for services/products.
 *
 * The database CHECK constraint (migrations 0041/0042) only permits
 * ('draft', 'published', 'archived', 'pending_review') for services/products.
 * `pending` is invalid and raises SQLSTATE 23514. The owner-creation forms must
 * write `pending_review` (never `pending`) for new services/products.
 *
 * Run: node scripts/tests/moderation-status.test.ts
 */

import { run, finish, assert, assertEqual } from "./suite.ts";
import {
  SERVICE_DEFAULT_STATUS,
  PRODUCT_DEFAULT_STATUS,
  SERVICE_STATUSES,
  PRODUCT_STATUSES,
} from "../../lib/business/moderation.ts";

const DB_CHECK_SET = ["draft", "published", "archived", "pending_review"];
const INVALID = "pending";

await run("service default status is pending_review (not pending)", () => {
  assertEqual(SERVICE_DEFAULT_STATUS, "pending_review");
  assert((SERVICE_DEFAULT_STATUS as string) !== INVALID, "must not be the invalid 'pending'");
});

await run("product default status is pending_review (not pending)", () => {
  assertEqual(PRODUCT_DEFAULT_STATUS, "pending_review");
  assert((PRODUCT_DEFAULT_STATUS as string) !== INVALID, "must not be the invalid 'pending'");
});

await run("service statuses include pending_review and exclude pending", () => {
  assert(SERVICE_STATUSES.includes("pending_review"), "pending_review must be selectable");
  assert(!SERVICE_STATUSES.includes(INVALID), "invalid 'pending' must never be offered");
  for (const s of DB_CHECK_SET) {
    assert(SERVICE_STATUSES.includes(s), `service status set must allow ${s}`);
  }
  assertEqual(SERVICE_STATUSES.length, DB_CHECK_SET.length);
});

await run("product statuses include pending_review and exclude pending", () => {
  assert(PRODUCT_STATUSES.includes("pending_review"), "pending_review must be selectable");
  assert(!PRODUCT_STATUSES.includes(INVALID), "invalid 'pending' must never be offered");
  for (const s of DB_CHECK_SET) {
    assert(PRODUCT_STATUSES.includes(s), `product status set must allow ${s}`);
  }
  assertEqual(PRODUCT_STATUSES.length, DB_CHECK_SET.length);
});

await run("no creation path sends the invalid status 'pending'", () => {
  // The new-record defaults are what the forms PUT/POST; neither may be 'pending'.
  assert((SERVICE_DEFAULT_STATUS as string) !== INVALID, "service default not 'pending'");
  assert((PRODUCT_DEFAULT_STATUS as string) !== INVALID, "product default not 'pending'");
  assert(!SERVICE_STATUSES.includes(INVALID), "service set excludes 'pending'");
  assert(!PRODUCT_STATUSES.includes(INVALID), "product set excludes 'pending'");
});

await finish();
