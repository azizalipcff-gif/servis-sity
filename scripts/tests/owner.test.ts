/**
 * Owner-identity resolution for business creation.
 *   B. created business.owner_id equals the authenticated user's id
 *   H. unauthenticated user cannot create a business
 *   I. invalid/missing owner identity fails safely (never empty/invalid owner_id)
 *
 * Run: node scripts/tests/owner.test.ts
 */

import { run, finish, assert } from "./suite.ts";
import { resolveOwnerId, OwnerIdentityError } from "../../lib/business/owner.ts";

const USER_A = "00000000-0000-4000-8000-00000000000a";

await run("B: resolved owner id equals the authenticated user's id", () => {
  assert(
    resolveOwnerId(USER_A) === USER_A,
    "owner_id must equal the session user id that performs the insert",
  );
});

await run("H: unauthenticated user cannot create a business", () => {
  let threw = false;
  try {
    resolveOwnerId(null);
  } catch (e) {
    threw = true;
    assert(e instanceof OwnerIdentityError, "must throw OwnerIdentityError");
  }
  assert(threw, "must throw when no authenticated user is present");
});

await run("I: invalid/missing owner identity fails safely", () => {
  for (const bad of [null, undefined, ""]) {
    let threw = false;
    try {
      resolveOwnerId(bad as string | null | undefined);
    } catch (e) {
      threw = true;
      assert(
        e instanceof OwnerIdentityError,
        "must throw OwnerIdentityError for: " + String(bad),
      );
    }
    assert(threw, "must throw for invalid owner identity: " + String(bad));
  }
});

await finish();
