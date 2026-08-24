import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseStoredUrl } from "../../lib/supabase/storage.ts";

const here = dirname(fileURLToPath(import.meta.url));

function readRoute(rel: string): string {
  return readFileSync(join(here, "..", "..", rel), "utf8");
}

// ---------------------------------------------------------------------------
// Static wiring checks: the owner delete routes must be server-authorized and
// must never trust the client. These guard against regressions where someone
// reintroduces a client-side `.delete()` or drops the archived-status gate.
// ---------------------------------------------------------------------------

test("owner-delete: product route is server-authorized + archived-gated", () => {
  const src = readRoute("app/api/dashboard/products/[id]/route.ts");
  assert.match(src, /export async function DELETE/, "exposes DELETE handler");
  assert.match(src, /getCurrentUser\(\)/, "requires an authenticated user");
  assert.match(src, /assertSameOrigin/, "applies CSRF/origin guard");
  assert.match(src, /rateLimit/, "applies rate limiting");
  assert.match(src, /status !== "archived"/, "only archived items are deletable");
  assert.match(src, /parseStoredUrl/, "cleans up owned storage objects");
  assert.doesNotMatch(src, /from\("products"\)\s*\.delete\(\)\s*\.eq\("business_id"/, "does NOT rely on client-supplied business_id filter");
});

test("owner-delete: service route is server-authorized + archived-gated", () => {
  const src = readRoute("app/api/dashboard/services/[id]/route.ts");
  assert.match(src, /export async function DELETE/, "exposes DELETE handler");
  assert.match(src, /getCurrentUser\(\)/, "requires an authenticated user");
  assert.match(src, /assertSameOrigin/, "applies CSRF/origin guard");
  assert.match(src, /rateLimit/, "applies rate limiting");
  assert.match(src, /status !== "archived"/, "only archived items are deletable");
});

// ---------------------------------------------------------------------------
// Requirement #5: the owner query must NOT hide archived products — otherwise
// there is no row to attach a Delete button to. getProductsForBusiness must use
// the SESSION client (so RLS returns the owner's own non-published rows) and
// must not filter by status.
// ---------------------------------------------------------------------------

test("owner-delete: getProductsForBusiness uses the session client (owner sees archived)", () => {
  const queries = readFileSync(join(here, "..", "..", "lib", "queries.ts"), "utf8");
  const m = queries.match(/export async function getProductsForBusiness[\s\S]*?\n\}\n/);
  assert.ok(m, "getProductsForBusiness is defined");
  const fn = m[0];
  assert.match(fn, /createClient\(\)/, "uses the authenticated (session) client");
  assert.doesNotMatch(fn, /createPublicClient\(\)/, "does NOT use the anonymous public client");
  assert.doesNotMatch(fn, /\.eq\("status"/, "does NOT filter by status (archived stays visible to owner)");
});

test("owner-delete: products manager shows a Delete button for archived items", () => {
  const src = readRoute("components/dashboard/products-manager.tsx");
  assert.match(src, /p\.status === "archived"/, "Delete is gated to archived status");
  assert.match(src, /ConfirmDialog/, "uses the confirmation dialog");
  assert.match(src, /\/api\/dashboard\/products\//, "calls the owner delete endpoint");
});

test("owner-delete: services manager shows a Delete button for archived items", () => {
  const src = readRoute("components/dashboard/services-manager.tsx");
  assert.match(src, /service\.status === "archived"/, "Delete is gated to archived status");
  assert.match(src, /ConfirmDialog/, "uses the confirmation dialog");
  assert.match(src, /\/api\/dashboard\/services\//, "calls the owner delete endpoint");
});

// ---------------------------------------------------------------------------
// Storage-cleanup safety: an external/demo URL must NEVER be accepted for
// deletion, so a crafted product image can't make us delete someone else's
// Storage object.
// ---------------------------------------------------------------------------

test("owner-delete: external image URLs are never treated as deletable", () => {
  assert.equal(parseStoredUrl(undefined), null);
  assert.equal(parseStoredUrl("https://example.com/x.png"), null);
  assert.equal(parseStoredUrl("data:image/png;base64,AAAA"), null);
});

test("owner-delete: project storage URLs decompose to bucket + key", () => {
  const base = "/storage/v1/object/public"; // storageBaseUrl() with no NEXT_PUBLIC_SUPABASE_URL
  const url = `${base}/business-gallery/user-123/gallery/x.webp`;
  const parsed = parseStoredUrl(url);
  assert.ok(parsed, "parsed");
  assert.equal(parsed.bucket, "business-gallery");
  assert.equal(parsed.key, "user-123/gallery/x.webp");
});

// ---------------------------------------------------------------------------
// Action menu (3-dot): every Product/Service must expose a consistent menu that
// reuses existing primitives and never bypasses moderation. View/Share are only
// offered for PUBLIC items; Delete only for archived/rejected items.
// ---------------------------------------------------------------------------

test("action-menu: products manager renders a status-aware 3-dot menu", () => {
  const src = readRoute("components/dashboard/products-manager.tsx");
  assert.match(src, /ActionsMenu/, "uses the shared ActionsMenu component");
  assert.match(src, /p\.status === "published"/, "gates View/Share to published products");
  assert.match(src, /\/product\//, "builds a public product URL when published");
  assert.match(src, /canDelete=\{p\.status === "archived"\}/, "Delete only for archived products");
});

test("action-menu: services manager renders a status-aware 3-dot menu", () => {
  const src = readRoute("components/dashboard/services-manager.tsx");
  assert.match(src, /ActionsMenu/, "uses the shared ActionsMenu component");
  assert.match(src, /service\.status === "published"/, "gates View/Share to published services");
  assert.match(src, /\/service\//, "builds a public service URL when published");
  assert.match(src, /canDelete=\{service\.status === "archived"\}/, "Delete only for archived services");
});

test("action-menu: shared component reuses existing primitives (no duplicates)", () => {
  const src = readRoute("components/dashboard/actions-menu.tsx");
  assert.match(src, /DropdownMenu/, "reuses the existing Radix DropdownMenu");
  assert.match(src, /useShare/, "reuses the shared share hook");
  assert.doesNotMatch(src, /\/api\/dashboard\//, "does NOT define a new delete API");
  assert.match(src, /onDelete\(\)/, "delegates deletion to the existing confirm flow");
});

test("action-menu: share never exposes unpublished content", () => {
  const src = readRoute("components/dashboard/actions-menu.tsx");
  assert.match(src, /const isPublic = status === "published"/, "public-visibility gate");
  assert.match(src, /showShare = isPublic/, "Share only rendered for public items");
  assert.match(src, /showView = isPublic/, "View only rendered for public items");
});

test("i18n: actions namespace present with required keys in EN/FR/AR", () => {
  const keys = [
    "moreActions",
    "view",
    "edit",
    "share",
    "delete",
    "copyLink",
    "linkCopied",
    "shareFailed",
    "cannotShareUnpublished",
    "deleteConfirmation",
  ];
  for (const loc of ["en", "fr", "ar"]) {
    const src = readRoute(`messages/${loc}.json`);
    assert.match(src, /"actions"/, `${loc}: actions namespace exists`);
    for (const key of keys) {
      assert.match(src, new RegExp(`"${key}"\\s*:`), `${loc}: actions.${key} exists`);
    }
  }
});

test("security: no duplicate delete API or edit route was introduced", () => {
  const products = readRoute("components/dashboard/products-manager.tsx");
  const services = readRoute("components/dashboard/services-manager.tsx");
  assert.match(products, /\/api\/dashboard\/products\//, "product delete calls existing endpoint");
  assert.match(services, /\/api\/dashboard\/services\//, "service delete calls existing endpoint");
  assert.match(products, /\/dashboard\/products\/\$\{p\.id\}\/edit/, "product edit reuses existing route");
  assert.match(services, /\/dashboard\/services\/\$\{service\.id\}\/edit/, "service edit reuses existing route");
});
