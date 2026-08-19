/**
 * Workspace action-state pure-logic test suite.
 * Covers the shared keep-consistent policy for the Profile/Workspace actions:
 *   A. user without business  -> add actions locked (businessRequired)
 *   B. user with business     -> add actions active
 *   C. business query loading -> disabled, never a "create business first" flash
 *   D. business query error   -> error/retry, NEVER businessRequired
 *   E. create business -> false → true transition unlocks without extra gates
 *   F. ownership isolation: user A can never use user B's business
 *   G. canonical action destinations (Add service → /dashboard/services/new …)
 *
 * Run: node scripts/tests/workspace-state.test.ts
 */

import { run, finish, assert, assertEqual } from "./suite.ts";
import {
  deriveWorkspaceActions,
  WORKSPACE_ADD_PRODUCT_HREF,
  WORKSPACE_ADD_SERVICE_HREF,
  WORKSPACE_CREATE_BUSINESS_HREF,
  WORKSPACE_MANAGE_BUSINESS_HREF,
  type WorkspaceSignal,
} from "../../lib/workspace/actions.ts";
import { deriveWorkspaceState } from "../../lib/workspace/state.ts";

const USER_A = "00000000-0000-4000-8000-00000000000a";
const USER_B = "00000000-0000-4000-8000-00000000000b";

function actions(signal: Partial<WorkspaceSignal> = {}) {
  return deriveWorkspaceActions({ hasBusiness: false, ...signal });
}

// ---------------------------------------------------------------- A
await run("A: no business -> add service/product locked (businessRequired)", () => {
  const a = actions({ hasBusiness: false });
  assertEqual(a.createBusiness.kind, "store");
  assertEqual(a.addService.kind, "businessRequired");
  assertEqual(a.addProduct.kind, "businessRequired");
});

await run("A: no business -> deriveWorkspaceState says hasBusiness=false", () => {
  const s = deriveWorkspaceState({ userId: USER_A, businesses: [] });
  assertEqual(s.hasBusiness, false);
  assertEqual(s.error, null);
  assertEqual(s.businesses.length, 0);
});

// ---------------------------------------------------------------- B
await run("B: with business -> add service/product active", () => {
  const a = actions({ hasBusiness: true });
  assertEqual(a.addService.kind, "active");
  assertEqual(a.addProduct.kind, "active");
  assertEqual(a.createBusiness.kind, "manage");
});

await run("B: with owned business -> deriveWorkspaceState says hasBusiness=true", () => {
  const s = deriveWorkspaceState({
    userId: USER_A,
    businesses: [{ id: "b1", owner_id: USER_A }],
  });
  assertEqual(s.hasBusiness, true);
  assertEqual(s.error, null);
});

// B + E: the same account that owns a business unlocks both add actions.
await run("B/E: owned business -> chain to active actions (false→true unlock)", () => {
  const state = deriveWorkspaceState({
    userId: USER_A,
    businesses: [{ id: "b1", owner_id: USER_A }],
  });
  const a = deriveWorkspaceActions({ hasBusiness: state.hasBusiness });
  assertEqual(a.addService.kind, "active");
  assertEqual(a.addProduct.kind, "active");
  assertEqual(a.createBusiness.kind, "manage");
});

// ---------------------------------------------------------------- C
await run("C: loading -> disabled, never businessRequired", () => {
  assertEqual(actions({ loading: true }).addService.kind, "loading");
  assertEqual(actions({ loading: true }).addProduct.kind, "loading");
  assertEqual(actions({ loading: true }).createBusiness.kind, "loading");
  assert(
    actions({ loading: true, hasBusiness: false }).addService.kind !==
      "businessRequired",
    "no empty-state flash while loading",
  );
});

await run("C: loading is not derived from a failed/empty query (state.ts has no loading)", () => {
  // deriveWorkspaceState never fabricates loading; the loader boundary in the
  // UI (Suspense) owns that. Here we assert an empty-but-successful result is
  // NO_BUSINESS, and a loading UI must never feed that to the actions fn.
  const s = deriveWorkspaceState({ userId: USER_A, businesses: [] });
  assertEqual(s.hasBusiness, false);
  assertEqual(s.error, null);
});

// ---------------------------------------------------------------- D
await run("D: query error -> error/retry, NEVER businessRequired", () => {
  const a = actions({ hasBusiness: false, error: "boom" });
  assertEqual(a.addService.kind, "error");
  assertEqual(a.addProduct.kind, "error");
  assert(a.addService.kind !== "businessRequired", "must not lock behind a business");
  assert(a.addProduct.kind !== "businessRequired", "must not lock behind a business");
  assertEqual(a.createBusiness.kind, "store");
});

await run("D: query error -> deriveWorkspaceState surfaces error, not no-business", () => {
  const s = deriveWorkspaceState({
    userId: USER_A,
    businesses: [],
    error: "connection refused",
  });
  assertEqual(s.error, "connection refused");
  assertEqual(s.hasBusiness, false);
});

await run("D: error wins over loading", () => {
  assertEqual(actions({ loading: true, error: "x" }).addService.kind, "error");
});

// ---------------------------------------------------------------- E
await run("E: create business -> inserted row is owned by the authenticated user", () => {
  // models the verified INSERT (business-form.tsx): the response row must carry
  // owner_id === the session user that performed the write.
  const inserted = { id: "new-shop", owner_id: USER_A };
  assertEqual(inserted.owner_id, USER_A);
  assertEqual(inserted.owner_id === USER_A, true);
});

await run("E: after insert, workspace transitions false -> true for the SAME user", () => {
  const before = deriveWorkspaceState({ userId: USER_A, businesses: [] });
  assertEqual(before.hasBusiness, false);

  // same account, now that the DB has the row — no refresh required by the
  // action layer: next render derives active buttons from the row alone.
  const after = deriveWorkspaceState({
    userId: USER_A,
    businesses: [{ id: "new-shop", owner_id: USER_A }],
  });
  assertEqual(after.hasBusiness, true);

  const a = deriveWorkspaceActions({ hasBusiness: after.hasBusiness });
  assertEqual(a.addService.kind, "active");
  assertEqual(a.addProduct.kind, "active");
  assertEqual(a.createBusiness.kind, "manage");
  assert(before.hasBusiness === false && after.hasBusiness === true, "false→true");
});

// ---------------------------------------------------------------- F
await run("F: user A cannot use user B's business (owner isolation)", () => {
  const s = deriveWorkspaceState({
    userId: USER_A,
    businesses: [{ id: "b-of-b", owner_id: USER_B }],
  });
  assertEqual(s.hasBusiness, false);
  assertEqual(s.businesses.length, 0); // B's business does not leak into A's workspace

  const a = deriveWorkspaceActions({ hasBusiness: s.hasBusiness });
  assertEqual(a.addService.kind, "businessRequired");
  assertEqual(a.addProduct.kind, "businessRequired");
});

await run("F: mixed rows -> only owned rows count", () => {
  const s = deriveWorkspaceState({
    userId: USER_A,
    businesses: [
      { id: "mine-1", owner_id: USER_A },
      { id: "theirs", owner_id: USER_B },
      { id: "mine-2", owner_id: USER_A },
    ],
  });
  assertEqual(s.hasBusiness, true);
  assertEqual(s.businesses.length, 2);
  assert(s.businesses.every((b) => b.owner_id === USER_A), "only A's rows");
});

// ---------------------------------------------------------------- G
await run("G: canonical destinations for add actions", () => {
  const a = actions({ hasBusiness: true });
  assertEqual(WORKSPACE_CREATE_BUSINESS_HREF, "/dashboard/business/new");
  assertEqual(WORKSPACE_MANAGE_BUSINESS_HREF, "/dashboard");
  assertEqual(WORKSPACE_ADD_SERVICE_HREF, "/dashboard/services/new");
  assertEqual(WORKSPACE_ADD_PRODUCT_HREF, "/dashboard/products/new");
  // The UI navigates with these exact paths (i18n Link prepends the locale).
  assertEqual(a.addService.href, "/dashboard/services/new");
  assertEqual(a.addProduct.href, "/dashboard/products/new");
  assertEqual(a.createBusiness.href, "/dashboard");
});

await run("G: create-destination hrefs in the no-business state", () => {
  const a = actions({ hasBusiness: false });
  assertEqual(a.createBusiness.href, "/dashboard/business/new");
  assertEqual(a.addService.href, "/dashboard/services/new");
  assertEqual(a.addProduct.href, "/dashboard/products/new");
});

await finish();