import { z } from "zod";

/**
 * Moroccan phone numbers — the only format accepted by the app.
 *
 * Valid input shapes (spaces, dots and dashes are tolerated anywhere in the
 * number, they are stripped before validation):
 *   - National:  0[5-7]XXXXXXXX  (10 digits, leading 0)
 *   - Intl. +212:[5-7]XXXXXXXX   (9 digits, leading 0 dropped)
 *   - Intl. 00212:[5-7]XXXXXXXX  (legacy dial prefix)
 *
 * Numbers whose 2nd/3rd digit is not a Morocco area code (5/6/7) are rejected,
 * and anything that is not a well-formed Moroccan mobile/fixed number is
 * rejected with "invalidPhone".
 */

/** Tolerated separators anywhere in the raw input. */
export const SEPARATOR_REGEX = /[\s.\-()]/g;

const AREA_CLEAN = /^[5-7]\d{8}$/;
const NATIONAL_CLEAN = /^0[5-7]\d{8}$/;

/** Validate a phone string and return the normalized national format ("06…"). */
export function normalizeMoroccanPhone(value: string): string | null {
  const clean = value.replace(SEPARATOR_REGEX, "");
  if (clean.startsWith("+212") && AREA_CLEAN.test(clean.slice(4))) {
    return "0" + clean.slice(4);
  }
  if (clean.startsWith("00212") && AREA_CLEAN.test(clean.slice(5))) {
    return "0" + clean.slice(5);
  }
  if (NATIONAL_CLEAN.test(clean)) return clean;
  return null;
}

export function isValidMoroccanPhone(value: string): boolean {
  return normalizeMoroccanPhone(value) !== null;
}

/** E.164 digits used by `https://wa.me/<digits>` / `tel:` links. */
export function toE164Digits(national: string): string {
  return national.startsWith("0") ? "212" + national.slice(1) : national;
}

/** Validate → transform to normalized national format (set by the caller). */
export const moroccanPhoneSchema = z
  .string()
  .min(8, "minLength")
  .max(24, "maxLength")
  .refine(isValidMoroccanPhone, "invalidPhone");