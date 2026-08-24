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

test("action-menu: products manager renders a top-corner 3-dot menu", () => {
  const src = readRoute("components/dashboard/products-manager.tsx");
  assert.match(src, /CardActionsMenu/, "uses the shared CardActionsMenu component");
  assert.match(src, /p\.status === "published"/, "gates View/Share to published products");
  assert.match(src, /\/product\//, "builds a public product URL when published");
  assert.match(src, /canDelete=\{p\.status === "archived"\}/, "Delete only for archived products");
  assert.match(src, /onTogglePin=\{\(\) => togglePin/, "exposes a Pin/Unpin action");
});

test("action-menu: services manager renders a top-corner 3-dot menu", () => {
  const src = readRoute("components/dashboard/services-manager.tsx");
  assert.match(src, /CardActionsMenu/, "uses the shared CardActionsMenu component");
  assert.match(src, /service\.status === "published"/, "gates View/Share to published services");
  assert.match(src, /\/service\//, "builds a public service URL when published");
  assert.match(src, /canDelete=\{service\.status === "archived"\}/, "Delete only for archived services");
  assert.match(src, /onTogglePin=\{\(\) => togglePin/, "exposes a Pin/Unpin action");
});

test("action-menu: shared component reuses existing primitives (no duplicates)", () => {
  const src = readRoute("components/dashboard/card-actions-menu.tsx");
  assert.match(src, /DropdownMenu/, "reuses the existing Radix DropdownMenu");
  assert.match(src, /useShare/, "reuses the shared share hook");
  assert.match(src, /absolute right-2 top-2/, "renders as a Facebook-style top-corner overlay");
  assert.doesNotMatch(src, /\/api\/dashboard\//, "does NOT define a new delete API");
  assert.match(src, /onDelete/, "delegates deletion to the existing confirm flow");
});

test("action-menu: share never exposes unpublished content", () => {
  const src = readRoute("components/dashboard/card-actions-menu.tsx");
  assert.match(src, /const isPublic = status === "published" \|\| status === "approved"/, "public-visibility gate (product/service published, business approved)");
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
    "pin",
    "unpin",
    "pinned",
    "unpinned",
    "pinFailed",
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

test("pin: product/service reuse the existing featured flag via PATCH on the same [id] route", () => {
  for (const kind of ["products", "services"]) {
    const src = readRoute(`app/api/dashboard/${kind}/[id]/route.ts`);
    assert.match(src, /export async function PATCH/, `${kind}: [id] route handles PATCH (pin toggle)`);
    assert.match(src, /\.update\(\{ featured: body\.featured \}\)/, `${kind}: PATCH only writes the existing featured flag`);
    assert.match(src, new RegExp('revalidateTag\\("' + kind + '"\\)'), `${kind}: revalidates the ${kind} cache`);
  }
});

test("pin: no dedicated pin column or duplicate API was introduced", () => {
  // The only pin-like column on products/services is `featured`; `pinned_at`
  // exists solely on conversation_members (messenger), not on these tables.
  const products = readRoute("app/api/dashboard/products/[id]/route.ts");
  const services = readRoute("app/api/dashboard/services/[id]/route.ts");
  assert.doesNotMatch(products, /pinned_at/, "products route does not invent a pin column");
  assert.doesNotMatch(services, /pinned_at/, "services route does not invent a pin column");
  assert.match(products, /export async function DELETE/, "still uses the single [id] route");
});

// ---------------------------------------------------------------------------
// The profile pages render their OWN local ProductCard/ServiceCard/BusinessCard
// (server components). The previous implementation added CardActionsMenu only to
// the dashboard managers, so it was invisible on /profile/*. These guard against
// that regression: the actual rendered profile cards must integrate the menu.
// ---------------------------------------------------------------------------

test("profile: products card renders the shared CardActionsMenu", () => {
  const page = readRoute("app/[locale]/profile/products/page.tsx");
  assert.match(page, /<ItemActions/, "products profile card renders ItemActions");
  assert.match(page, /relative flex flex-col overflow-hidden rounded-2xl/, "card is a relative positioning context");
  const actions = readRoute("components/profile/item-actions.tsx");
  assert.match(actions, /CardActionsMenu/, "ItemActions renders the shared CardActionsMenu");
});

test("profile: services card renders the shared CardActionsMenu", () => {
  const page = readRoute("app/[locale]/profile/services/page.tsx");
  assert.match(page, /<ItemActions/, "services profile card renders ItemActions");
  assert.match(page, /relative flex flex-col overflow-hidden rounded-2xl/, "card is a relative positioning context");
  const actions = readRoute("components/profile/item-actions.tsx");
  assert.match(actions, /CardActionsMenu/, "ItemActions renders the shared CardActionsMenu");
});

test("profile: business card renders the shared CardActionsMenu (Edit + Share only)", () => {
  const page = readRoute("app/[locale]/profile/business/page.tsx");
  assert.match(page, /<ItemActions/, "business profile card renders ItemActions");
  assert.match(page, /relative flex flex-col rounded-2xl/, "card is a relative positioning context");
  const actions = readRoute("components/profile/item-actions.tsx");
  assert.match(actions, /CardActionsMenu/, "ItemActions renders the shared CardActionsMenu");
  assert.match(page, /kind="business"/, "business card uses the business variant (no delete / no pin)");
});

