import { SEPARATOR_REGEX } from "../validations/phone.ts";

/**
 * WhatsApp public-link helpers.
 *
 * WhatsApp numbers are stored in ONE canonical shape: `+212xxxxxxxxx`
 * (E.164 with leading +). `normalizeMoroccanWhatsApp` is the single
 * normalization function used on load and on save, so the same number can
 * never be persisted in multiple formats.
 *
 * The DEFAULT WhatsApp button is deactivated until the owner explicitly
 * enables it (`whatsapp_enabled`). When enabled, the public link is always
 * rebuilt from the normalized number — never from a hand-built string.
 */

export type WhatsAppSource = {
  whatsapp?: string | null;
  whatsapp_url?: string | null;
  whatsapp_enabled?: boolean | null;
};

/**
 * Canonicalize a Moroccan WhatsApp (mobile) number to `+212xxxxxxxxx`.
 *
 * Accepts national (`0659785764`) and international (`+212659785764`,
 * including separators like `+212 659 785 764`). Rejects `00212…`, doubled
 * country codes (`+212212659785764`) and any malformed value. Returns null
 * when the number is not a well-formed Moroccan mobile.
 */
export function normalizeMoroccanWhatsApp(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const clean = value.replace(SEPARATOR_REGEX, "");
  const m = /^(\+212|0)([5-7]\d{8})$/.exec(clean);
  return m ? `+212${m[2]}` : null;
}

/**
 * Editable-input helper: reduce whatever the user typed/pasted to the 9-digit
 * national portion (`6XXXXXXXX`/`7XXXXXXXX`). Drops separators, a leading `0`
 * national digit, and a leading country-code `212` (pastable full numbers).
 */
export function whatsappNationalDigits(value: string): string {
  let digits = value.replace(/\D/g, "");
  digits = digits.replace(/^0+/, "");
  while (digits.length > 9 && digits.startsWith("212")) {
    digits = digits.slice(3);
  }
  return digits.slice(0, 9);
}

/** Display helper: group the national digit portion as `6XX XXX XXX`. */
export function formatWhatsAppNational(digits: string): string {
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ");
}

/** Canonical wa.me digits (no leading +) for a raw number, or null. */
function e164Digits(value: string | null | undefined): string | null {
  const normalized = normalizeMoroccanWhatsApp(value);
  return normalized ? normalized.slice(1) : null;
}

/** E.164 digits for the number, preferring (and re-normalizing) the stored URL. */
export function whatsappE164Digits(business: WhatsAppSource): string | null {
  const url = business.whatsapp_url?.trim();
  if (url) {
    const m = /(?:wa\.me|api\.whatsapp\.com\/send)\/?([\d+]+)/.exec(url);
    if (m) {
      // Legacy URLs may embed a stray `+` or a national format — strip and
      // re-normalize so we never emit `wa.me/+212…` or `wa.me/06…`.
      const digits = m[1].replace(/\D/g, "");
      const restored = digits.startsWith("212") ? `+${digits}` : digits;
      const normalized = normalizeMoroccanWhatsApp(restored);
      if (normalized) return normalized.slice(1);
    }
  }
  if (!business.whatsapp) return null;
  return e164Digits(business.whatsapp);
}

/** A shareable wa.me link, or null when the business has no valid number. */
export function buildWhatsAppUrl(business: WhatsAppSource): string | null {
  const digits = whatsappE164Digits(business);
  return digits ? `https://wa.me/${digits}` : null;
}

/** Whether the public WhatsApp CTA should render at all. */
export function isWhatsAppEnabled(business: WhatsAppSource): boolean {
  return Boolean(business.whatsapp_enabled) && whatsappE164Digits(business) !== null;
}