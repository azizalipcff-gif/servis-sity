/**
 * WhatsApp number canonicalization suite.
 * Verifies single-format normalization, invalid-input rejection (duplicate
 * country code, 00212 legacy prefix), and wa.me URL generation that never
 * emits `+` or national-format links.
 */

import { run, finish, assertEqual, assert } from "./suite.ts";
import {
  normalizeMoroccanWhatsApp,
  whatsappNationalDigits,
  formatWhatsAppNational,
  buildWhatsAppUrl,
} from "../../lib/whatsapp/index.ts";
import {
  whatsappSchema,
  whatsappOptionalSchema,
  businessSchema,
} from "../../lib/validations/schemas.ts";

// ── Canonical normalization ──────────────────────────────────────────────

await run("whatsapp: local Moroccan number -> +212", () => {
  assertEqual(normalizeMoroccanWhatsApp("0659785764"), "+212659785764");
  assertEqual(normalizeMoroccanWhatsApp("0661234567"), "+212661234567");
  assertEqual(normalizeMoroccanWhatsApp("0671234567"), "+212671234567");
  assertEqual(normalizeMoroccanWhatsApp("0681234567"), "+212681234567");
  assertEqual(normalizeMoroccanWhatsApp("0691234567"), "+212691234567");
});

await run("whatsapp: +212 number is identity", () => {
  assertEqual(normalizeMoroccanWhatsApp("+212659785764"), "+212659785764");
});

await run("whatsapp: formatted +212 number is normalized", () => {
  assertEqual(normalizeMoroccanWhatsApp("+212 659 785 764"), "+212659785764");
  assertEqual(normalizeMoroccanWhatsApp("+212-659-785-764"), "+212659785764");
});

await run("whatsapp: invalid numbers are rejected", () => {
  assert(normalizeMoroccanWhatsApp("123456") === null, "too short");
  assert(normalizeMoroccanWhatsApp("") === null, "empty");
  assert(normalizeMoroccanWhatsApp(null) === null, "null");
  assert(normalizeMoroccanWhatsApp("00659785764") === null, "00 prefix");
  assert(normalizeMoroccanWhatsApp("059785764") === null, "9 digits only");
  assert(normalizeMoroccanWhatsApp("+123456789012") === null, "non-MA country");
});

await run("whatsapp: duplicate +212 is prevented", () => {
  assertEqual(normalizeMoroccanWhatsApp("+212212659785764"), null);
  assertEqual(normalizeMoroccanWhatsApp("+2120659785764"), null);
});

await run("whatsapp: legacy 00212 dial prefix is rejected", () => {
  assertEqual(normalizeMoroccanWhatsApp("00212659785764"), null);
});

// ── wa.me URL generation ─────────────────────────────────────────────────

await run("whatsapp: wa.me built from local number", () => {
  assertEqual(
    buildWhatsAppUrl({ whatsapp: "0659785764" }),
    "https://wa.me/212659785764",
  );
});

await run("whatsapp: wa.me built from formatted +212 number", () => {
  assertEqual(
    buildWhatsAppUrl({ whatsapp: "+212 659 785 764" }),
    "https://wa.me/212659785764",
  );
});

await run("whatsapp: wa.me never includes + or national format", () => {
  const links = [
    buildWhatsAppUrl({ whatsapp_url: "https://wa.me/+212659785764" }),
    buildWhatsAppUrl({ whatsapp_url: "https://wa.me/0659785764" }),
    buildWhatsAppUrl({ whatsapp_url: "https://wa.me/212659785764" }),
  ];
  for (const link of links) {
    assertEqual(link, "https://wa.me/212659785764");
    assert(link !== null, "link must be non-null");
    assert(!link.includes("wa.me/+"), "must not carry a + after wa.me/");
    assert(!/wa\.me\/0\d{9}/.test(link), "must not carry a national format");
  }
});

await run("whatsapp: duplicate +212 yields no wa.me link", () => {
  assertEqual(buildWhatsAppUrl({ whatsapp: "+212212659785764" }), null);
  assertEqual(buildWhatsAppUrl({ whatsapp_url: "https://wa.me/212212659785764" }), null);
});

await run("whatsapp: missing or invalid number yields no wa.me link", () => {
  assertEqual(buildWhatsAppUrl({}), null);
  assertEqual(buildWhatsAppUrl({ whatsapp: "059785764" }), null);
});

// ── Schema: single canonical storage shape ───────────────────────────────

await run("whatsapp: schema normalizes to canonical +212", () => {
  assertEqual(whatsappSchema.parse("0661234567"), "+212661234567");
  assertEqual(whatsappSchema.parse("+212 659 785 764"), "+212659785764");
});

await run("whatsapp: schema rejects invalid values", () => {
  assert(!whatsappSchema.safeParse("00212659785764").success, "00212 rejected");
  assert(!whatsappSchema.safeParse("+212212659785764").success, "double +212 rejected");
  assert(!whatsappSchema.safeParse("123456").success, "garbage rejected");
});

await run("whatsapp: business schema stores canonical number", () => {
  const ok = businessSchema.safeParse({
    name: "Test",
    category_id: "11111111-1111-4111-8111-111111111111",
    city_id: "11111111-1111-4111-8111-111111111111",
    slug: "test",
    whatsapp: "0671234567",
  });
  assert(ok.success, "business schema parses");
  if (ok.success) {
    assertEqual(ok.data.whatsapp, "+212671234567", "canonical stored value");
  }
});

await run("whatsapp: empty / absent whatsapp is allowed", () => {
  assert(whatsappOptionalSchema.safeParse("").success, "empty allowed");
  assert(whatsappOptionalSchema.safeParse(undefined).success, "undefined allowed");
  const ok = businessSchema.safeParse({
    name: "Test",
    category_id: "11111111-1111-4111-8111-111111111111",
    city_id: "11111111-1111-4111-8111-111111111111",
    slug: "test",
  });
  assert(ok.success, "business schema parses without whatsapp");
  assert(ok.success && ok.data.whatsapp === undefined, "absent whatsapp ok");
});

// ── Editable-input helpers (fixed +212 prefix) ───────────────────────────

await run("whatsapp input: 659785764 -> canonical +212659785764", () => {
  assertEqual(whatsappNationalDigits("659785764"), "659785764");
  assertEqual(formatWhatsAppNational("659785764"), "659 785 764");
  assertEqual(normalizeMoroccanWhatsApp(`+212${whatsappNationalDigits("659785764")}`), "+212659785764");
});

await run("whatsapp input: 712345678 -> canonical +212712345678", () => {
  assertEqual(whatsappNationalDigits("712345678"), "712345678");
  assertEqual(formatWhatsAppNational("712345678"), "712 345 678");
  assertEqual(normalizeMoroccanWhatsApp(`+212${whatsappNationalDigits("712345678")}`), "+212712345678");
});

await run("whatsapp input: 0659785764 cleans to national digits", () => {
  assertEqual(whatsappNationalDigits("0659785764"), "659785764");
  assertEqual(formatWhatsAppNational("659785764"), "659 785 764");
  assertEqual(normalizeMoroccanWhatsApp("0659785764"), "+212659785764");
});

await run("whatsapp input: +212 / pasted numbers load to 9 national digits", () => {
  assertEqual(whatsappNationalDigits("+212659785764"), "659785764");
  assertEqual(whatsappNationalDigits("+212 659 785 764"), "659785764");
  assertEqual(whatsappNationalDigits("00212659785764"), "659785764");
  assertEqual(whatsappNationalDigits("+212212659785764"), "659785764");
  assertEqual(formatWhatsAppNational("659785764"), "659 785 764");
});

await run("whatsapp input: rejects letters and clamps to 9 digits", () => {
  assertEqual(whatsappNationalDigits("659785764123"), "659785764");
  assertEqual(whatsappNationalDigits("abc6597def"), "6597");
  assertEqual(whatsappNationalDigits(""), "");
  assertEqual(formatWhatsAppNational(""), "");
  assertEqual(formatWhatsAppNational("6597"), "659 7");
});

await run("whatsapp input: schema rejects invalid input, URL stays canonical", () => {
  const digits = whatsappNationalDigits("659785764");
  const full = `+212${digits}`;
  assertEqual(full, "+212659785764");
  assertEqual(whatsappSchema.parse(full), "+212659785764");
  assertEqual(buildWhatsAppUrl({ whatsapp: full }), "https://wa.me/212659785764");
  assert(!whatsappSchema.safeParse("+212459785764").success, "non 5-7 prefix rejected");
});

await finish();