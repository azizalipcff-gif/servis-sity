/**
 * Canonicalization for Arabic, French and English text.
 *
 * Goal: two surface strings that name the same real-world thing must collapse
 * to the same canonical form, so alias lookup is exact-token-equality instead
 * of fuzzy "contains". Rules are deliberately conservative (see each step)
 * and every rule is exercised by the query test-suite.
 */

const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

const CHAR_CLASS_RE = /[\p{L}\p{N}]+/gu;

/** Arabic present? (includes extended letters/digits). */
export function hasArabic(s: string): boolean {
  return /[\u0600-\u06FF]/.test(s);
}

/** Heavy Unicode marks: Arabic diacritics, tatweel, superscript alef, ZWNJ/ZWJ. */
const HEAVY_MARKS = /[\u064B-\u065F\u0670\u200C\u200D\u0640]/g;

/** Convert Arabic-Indic and Persian digits to ASCII. Only first occurrence class. */
export function toAsciiDigits(s: string): string {
  let out = s;
  for (let i = 0; i < 10; i += 1) {
    out = out.replace(new RegExp(`[${AR_DIGITS[i]}${FA_DIGITS[i]}]`, "g"), String(i));
  }
  return out;
}

/**
 * Normalize one word to its canonical token form.
 * - Arabic: strip diacritics/tatweel/joiner, unify alef & hamza seats,
 *   tâ' marbûṭa → h' (ه), alef maqsura → y', drop the "ال" definite article
 *   when a stem remains, digits → ASCII.
 * - Latin: lowercase, strip combining accents (é→e), fold ç/œ/æ/ß.
 * - Mixed/other: lowercase only.
 */
export function normalizeToken(raw: string): string {
  let s = raw.trim().toLowerCase();

  if (hasArabic(s)) {
    s = s
      .replace(HEAVY_MARKS, "")
      .replace(/[\u0623\u0625\u0622\u0671]/g, "ا")
      .replace(/[\u0629]/g, "ه")
      .replace(/[\u0624]/g, "و")
      .replace(/[\u0626]/g, "ي")
      .replace(/[\u0649]/g, "ي");
    s = toAsciiDigits(s);
    const stem = s.replace(/^\u0627\u0644/, "");
    if (stem.length >= 2) s = stem;
    return s;
  }

  s = s
    .replace(/\u2018|\u2019/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "")
    .replace(/ç/g, "c")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss");

  return toAsciiDigits(s);
}

/**
 * Split free text into words with both original and canonical spellings.
 * Runs of letters/digits only — punctuation, apostrophes and symbols are
 * ignored, which naturally drops "★", "l'", diacritics, etc.
 */
export function wordStream(text: string): Array<{ orig: string; norm: string }> {
  const out: Array<{ orig: string; norm: string }> = [];
  const re = new RegExp(CHAR_CLASS_RE.source, "gu");
  re.lastIndex = 0;
  for (const m of text.matchAll(re)) {
    const w = m[0];
    out.push({ orig: w, norm: normalizeToken(w) });
  }
  return out;
}

/** Canonical tokens of a word/phrase (for alias indexes). */
export function canonicalTokens(phrase: string): string[] {
  return wordStream(phrase).map((t) => t.norm);
}

/** Canonical, whitespace-joined form of a phrase for display/compare. */
export function canonicalize(phrase: string): string {
  return canonicalTokens(phrase).join(" ");
}