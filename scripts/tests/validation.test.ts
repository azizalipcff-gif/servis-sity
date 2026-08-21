/**
 * Duplicate-protection & validation regression suite (Phase: duplicate
 * protection + data validation). Covers the zod schemas that guard the
 * client/server boundaries for the entities that gained DB-level unique
 * protection (services, featured, verification, bookings) plus related
 * validation invariants.
 *
 * Run: node scripts/tests/validation.test.ts
 */

import { run, finish, assert, assertEqual } from "./suite.ts";
import {
  businessSchema,
  serviceSchema,
  bookingSchema,
  reviewSchema,
  replySchema,
  reportSchema,
  phoneSchema,
  uuidSchema,
  httpUrlSchema,
  verificationRequestSchema,
  featuredPurchaseSchema,
  couponPreviewSchema,
} from "../../lib/validations/schemas.ts";
import {
  planCreateSchema,
  planPatchSchema,
  couponCreateSchema,
  couponPatchSchema,
  paymentPatchSchema,
  verificationPatchSchema,
  featuredPatchSchema,
} from "../../lib/validations/admin-schemas.ts";
import { slugify } from "../../lib/slug.ts";

const UUID = "00000000-0000-0000-0000-000000000000";

/* ---- service schema (duplicate-creation input) ---- */
await run("service: valid input parses", () => {
  const r = serviceSchema.safeParse({ name: "Coupe Homme", price: 80, duration_minutes: 30 });
  assert(r.success, "expected valid service to parse");
});

await run("service: empty name rejected", () => {
  const r = serviceSchema.safeParse({ name: "", price: 0 });
  assert(!r.success, "empty name must be rejected");
});

await run("service: negative price rejected", () => {
  const r = serviceSchema.safeParse({ name: "Coupe", price: -5 });
  assert(!r.success, "negative price must be rejected");
});

await run("service: negative duration rejected", () => {
  const r = serviceSchema.safeParse({ name: "Coupe", duration_minutes: -1 });
  assert(!r.success, "negative duration must be rejected");
});

await run("service: name length capped at 120", () => {
  const r = serviceSchema.safeParse({ name: "x".repeat(121) });
  assert(!r.success, "name > 120 chars must be rejected");
});

/* ---- booking schema ---- */
await run("booking: valid input parses", () => {
  const r = bookingSchema.safeParse({
    business_id: UUID,
    service_id: UUID,
    client_name: "Ahmed",
    client_phone: "+212600000000",
    booking_date: "2026-08-20",
    booking_time: "14:30",
  });
  assert(r.success, "expected valid booking to parse");
});

await run("booking: non-uuid business_id rejected", () => {
  const r = bookingSchema.safeParse({
    business_id: "not-a-uuid",
    client_name: "Ahmed",
    client_phone: "+212600000000",
    booking_date: "2026-08-20",
    booking_time: "14:30",
  });
  assert(!r.success, "non-uuid business_id must be rejected");
});

await run("booking: malformed date rejected", () => {
  const r = bookingSchema.safeParse({
    business_id: UUID,
    client_name: "Ahmed",
    client_phone: "+212600000000",
    booking_date: "20-08-2026",
    booking_time: "14:30",
  });
  assert(!r.success, "wrong date format must be rejected");
});

await run("booking: invalid time rejected", () => {
  const r = bookingSchema.safeParse({
    business_id: UUID,
    client_name: "Ahmed",
    client_phone: "+212600000000",
    booking_date: "2026-08-20",
    booking_time: "25:99",
  });
  assert(!r.success, "invalid time must be rejected");
});

await run("booking: invalid phone rejected", () => {
  const r = bookingSchema.safeParse({
    business_id: UUID,
    client_name: "Ahmed",
    client_phone: "abc",
    booking_date: "2026-08-20",
    booking_time: "14:30",
  });
  assert(!r.success, "invalid phone must be rejected");
});

/* ---- review schema (rating range) ---- */
await run("review: rating out of range rejected", () => {
  const ok = reviewSchema.safeParse({ business_id: UUID, rating: 5 });
  const badHigh = reviewSchema.safeParse({ business_id: UUID, rating: 6 });
  const badLow = reviewSchema.safeParse({ business_id: UUID, rating: 0 });
  assert(ok.success, "rating 5 must parse");
  assert(!badHigh.success, "rating 6 must be rejected");
  assert(!badLow.success, "rating 0 must be rejected");
});

await run("review: comment sanitized + capped", () => {
  const r = reviewSchema.safeParse({ business_id: UUID, rating: 4, comment: "x".repeat(5000) });
  assert(r.success, "long comment parses (sanitize caps it)");
  assertEqual(r.data?.comment?.length, 2000, "comment capped at 2000");
});

/* ---- reply / report ---- */
await run("reply: empty reply rejected", () => {
  const r = replySchema.safeParse({ review_id: UUID, reply: "" });
  assert(!r.success, "empty reply must be rejected");
});

await run("report: short reason rejected", () => {
  const r = reportSchema.safeParse({ business_id: UUID, reason: "ab" });
  assert(!r.success, "reason < 3 chars must be rejected");
});

/* ---- phone schema (bookings client_phone, business contact) ---- */
await run("phone: moroccan format accepted", () => {
  for (const p of ["+212600000000", "0600000000", "06 00 00 00 00"]) {
    assert(phoneSchema.safeParse(p).success, `phone ${p} must parse`);
  }
});

/* ---- business schema (slug duplicate prevention) ---- */
await run("business: valid input parses", () => {
  const r = businessSchema.safeParse({
    name: "Salon",
    category_id: UUID,
    city_id: UUID,
    slug: "salon-casablanca",
  });
  assert(r.success, "valid business must parse");
});

await run("business: invalid slug rejected", () => {
  const r = businessSchema.safeParse({
    name: "Salon",
    category_id: UUID,
    city_id: UUID,
    slug: "Salon Casablanca",
  });
  assert(!r.success, "slug with spaces/uppercase must be rejected");
});

await run("business: non-uuid category rejected", () => {
  const r = businessSchema.safeParse({ name: "Salon", category_id: "x", city_id: UUID, slug: "salon" });
  assert(!r.success, "non-uuid category_id must be rejected");
});

/* ---- slugify determinism (products/services/managers use it) ---- */
await run("slugify: deterministic + normalized", () => {
  assertEqual(slugify("Coupe Homme"), "coupe-homme");
  assertEqual(slugify("Coupe   Homme"), "coupe-homme");
  assertEqual(slugify("  COUPE HOMME  "), "coupe-homme");
  assertEqual(slugify("Coupé Hôtel"), "coupe-hotel");
});

await run("slugify: empty/unsafe input gets fallback", () => {
  const s = slugify("!!!");
  assert(typeof s === "string" && s.length > 0, "empty slug falls back to timestamp");
});

/* ---- shared uuid schema ---- */
await run("uuidSchema: valid uuids accepted, junk rejected", () => {
  assert(uuidSchema.safeParse(UUID).success, "zero uuid must parse");
  assert(!uuidSchema.safeParse("not-a-uuid").success, "junk must be rejected");
  assert(!uuidSchema.safeParse("").success, "empty must be rejected");
  assert(!uuidSchema.safeParse("00000000-0000-0000-0000-00000000000G").success, "bad hex must be rejected");
});

/* ---- http URL schema (billing verification docs) ---- */
await run("httpUrlSchema: only http(s) accepted", () => {
  assert(httpUrlSchema.safeParse("https://x.supabase.co/obj/id.png").success, "https url must parse");
  assert(httpUrlSchema.safeParse("http://example.com/a.png").success, "http url must parse");
  assert(!httpUrlSchema.safeParse("javascript:alert(1)").success, "javascript: must be rejected");
  assert(!httpUrlSchema.safeParse("data:text/html,x").success, "data: must be rejected");
  assert(!httpUrlSchema.safeParse("not a url").success, "non-url must be rejected");
});

/* ---- billing verification request ---- */
await run("verificationRequestSchema: valid submission parses", () => {
  const r = verificationRequestSchema.safeParse({
    businessId: UUID,
    idDocumentUrl: "https://x.supabase.co/obj/id.png",
    notes: "request",
  });
  assert(r.success, "valid submission must parse");
});

await run("verificationRequestSchema: non-uuid businessId rejected", () => {
  const r = verificationRequestSchema.safeParse({
    businessId: "bad",
    idDocumentUrl: "https://x.supabase.co/obj/id.png",
  });
  assert(!r.success, "non-uuid businessId must be rejected");
});

await run("verificationRequestSchema: javascript: doc url rejected", () => {
  const r = verificationRequestSchema.safeParse({
    businessId: UUID,
    licenseUrl: "javascript:alert(1)",
  });
  assert(!r.success, "non-http(s) doc url must be rejected");
});

await run("verificationRequestSchema: notes capped at 2000", () => {
  const r = verificationRequestSchema.safeParse({ businessId: UUID, notes: "x".repeat(2001) });
  assert(!r.success, "notes > 2000 chars must be rejected");
});

/* ---- billing featured purchase ---- */
await run("featuredPurchaseSchema: valid + default surface", () => {
  const r = featuredPurchaseSchema.safeParse({ businessId: UUID });
  assert(r.success, "businessId alone must parse");
  assertEqual(r.data?.surface, "search", "surface defaults to search");
});

await run("featuredPurchaseSchema: bogus surface rejected", () => {
  const ok = featuredPurchaseSchema.safeParse({ businessId: UUID, surface: "homepage" });
  const bad = featuredPurchaseSchema.safeParse({ businessId: UUID, surface: "spam" });
  assert(ok.success, "homepage must parse");
  assert(!bad.success, "unknown surface must be rejected");
});

await run("featuredPurchaseSchema: non-uuid businessId rejected", () => {
  const r = featuredPurchaseSchema.safeParse({ businessId: "x" });
  assert(!r.success, "non-uuid businessId must be rejected");
});

/* ---- billing coupon preview ---- */
await run("couponPreviewSchema: subtotal validated non-negative", () => {
  const ok = couponPreviewSchema.safeParse({ code: "WELCOME", planCode: "premium", subtotalCents: 0 });
  const neg = couponPreviewSchema.safeParse({ code: "WELCOME", planCode: "premium", subtotalCents: -5 });
  assert(ok.success, "zero subtotal must parse");
  assert(!neg.success, "negative subtotal must be rejected");
});

/* ---- admin plans ---- */
await run("planCreateSchema: valid plan parses", () => {
  const r = planCreateSchema.safeParse({ plan_key: "premium", interval: "monthly", name: "Premium" });
  assert(r.success, "valid plan must parse");
});

await run("planCreateSchema: bad interval / plan_key rejected", () => {
  const badInterval = planCreateSchema.safeParse({ plan_key: "premium", interval: "weekly", name: "P" });
  const badKey = planCreateSchema.safeParse({ plan_key: "gold", interval: "monthly", name: "P" });
  assert(!badInterval.success, "unknown interval must be rejected");
  assert(!badKey.success, "unknown plan_key must be rejected");
});

await run("planCreateSchema: negative price rejected", () => {
  const r = planCreateSchema.safeParse({ plan_key: "premium", interval: "monthly", name: "P", price_cents: -1 });
  assert(!r.success, "negative price must be rejected");
});

await run("planPatchSchema: empty patch rejected, id required", () => {
  const empty = planPatchSchema.safeParse({ id: UUID });
  const badId = planPatchSchema.safeParse({ id: "x", name: "P" });
  const ok = planPatchSchema.safeParse({ id: UUID, price_cents: 100 });
  assert(!empty.success, "empty patch must be rejected");
  assert(!badId.success, "non-uuid id must be rejected");
  assert(ok.success, "non-empty valid patch must parse");
});

/* ---- admin coupons ---- */
await run("couponCreateSchema: valid coupon parses", () => {
  const r = couponCreateSchema.safeParse({ code: "WELCOME", type: "percent", value: 10 });
  assert(r.success, "valid coupon must parse");
});

await run("couponCreateSchema: bad type / negative value / bad period rejected", () => {
  const badType = couponCreateSchema.safeParse({ code: "X", type: "bogo", value: 1 });
  const negValue = couponCreateSchema.safeParse({ code: "X", type: "fixed", value: -1 });
  const badPeriod = couponCreateSchema.safeParse({ code: "X", type: "percent", value: 1, period: "weekly" });
  assert(!badType.success, "unknown coupon type must be rejected");
  assert(!negValue.success, "negative value must be rejected");
  assert(!badPeriod.success, "unknown period must be rejected");
});

await run("couponCreateSchema: invalid expires_at rejected", () => {
  const r = couponCreateSchema.safeParse({ code: "X", type: "percent", value: 1, expires_at: "not-a-date" });
  assert(!r.success, "unparseable expires_at must be rejected");
});

await run("couponPatchSchema: id + at least one field required", () => {
  const empty = couponPatchSchema.safeParse({ id: UUID });
  const ok = couponPatchSchema.safeParse({ id: UUID, active: false });
  assert(!empty.success, "empty patch must be rejected");
  assert(ok.success, "valid patch must parse");
});

/* ---- admin payment / verification / featured actions ---- */
await run("paymentPatchSchema: action enum + uuid enforced", () => {
  const ok = paymentPatchSchema.safeParse({ id: UUID, action: "confirm" });
  const bad = paymentPatchSchema.safeParse({ id: UUID, action: "void" });
  const badId = paymentPatchSchema.safeParse({ id: "x", action: "refund" });
  assert(ok.success, "confirm must parse");
  assert(!bad.success, "unknown action must be rejected");
  assert(!badId.success, "non-uuid id must be rejected");
});

await run("verificationPatchSchema: status enum enforced", () => {
  const ok = verificationPatchSchema.safeParse({ id: UUID, status: "approved" });
  const bad = verificationPatchSchema.safeParse({ id: UUID, status: "approved_now" });
  assert(ok.success, "approved must parse");
  assert(!bad.success, "unknown status must be rejected");
});

await run("featuredPatchSchema: action enum enforced", () => {
  const ok = featuredPatchSchema.safeParse({ id: UUID, action: "revoke" });
  const bad = featuredPatchSchema.safeParse({ id: UUID, action: "destroy" });
  assert(ok.success, "revoke must parse");
  assert(!bad.success, "unknown action must be rejected");
});

/* ---- bookings cross-tenant guard (route-level invariant) ---- */
await run("bookingSchema: uuid service_id enforced", () => {
  const r = bookingSchema.safeParse({
    business_id: UUID,
    service_id: "not-a-uuid",
    client_name: "Ahmed",
    client_phone: "+212600000000",
    booking_date: "2026-08-20",
    booking_time: "14:30",
  });
  assert(!r.success, "non-uuid service_id must be rejected");
});

await finish();
