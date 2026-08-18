import {
  normalizeMoroccanPhone,
  toE164Digits,
} from "@/lib/validations/phone";

/**
 * WhatsApp public-link helpers.
 *
 * The DEFAULT WhatsApp button is deactivated until the owner explicitly
 * enables it (`whatsapp_enabled`). When enabled, the link uses the stored
 * `whatsapp_url` (a `wa.me/<E.164>` link computed when the number is saved)
 * and falls back to normalizing the raw `whatsapp` number.
 */

export type WhatsAppSource = {
  whatsapp?: string | null;
  whatsapp_url?: string | null;
  whatsapp_enabled?: boolean | null;
};

/** E.164 digits for the number, preferring the stored wa.me URL. */
export function whatsappE164Digits(business: WhatsAppSource): string | null {
  const url = business.whatsapp_url?.trim();
  if (url) {
    const m = /(?:wa\.me|api\.whatsapp\.com\/send)\/?([\d+]+)/.exec(url);
    if (m) return m[1];
  }
  if (!business.whatsapp) return null;
  const normalized = normalizeMoroccanPhone(business.whatsapp);
  return normalized ? toE164Digits(normalized) : null;
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