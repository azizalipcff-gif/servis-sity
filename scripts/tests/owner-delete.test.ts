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
