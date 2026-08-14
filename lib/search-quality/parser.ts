/**
 * Deterministic natural-language → search filters parser.
 *
 * Replacement for `lib/search/nl-parser.ts`. Differences:
 * - Neutral order: city, category and modifiers can appear anywhere; the
 *   longest-alias-first index decides intent, not sentence position.
 * - Token-run matching: multi-word aliases ("الدار البيضاء", "coffee house",
 *   "cours particulier", "hair salon") match as contiguous canonical tokens, so
 *   "casa" only resolves as a city when "casablanca"/"casa blanca" did not win.
 * - Robust spelling: Arabic diacritics/tâ' marbûṭa/alef variants fold, French
 *   accents fold, Arabic-Indic digits fold to ASCII.
 * - Residual `q` keeps the ORIGINAL (accent-preserved) words that were not
 *   consumed, so it still matches raw ilike against accented catalog names.
 */

import { wordStream, toAsciiDigits } from "./normalize.ts";
import { ALIAS_INDEX } from "./vocabularies.ts";
import type { SearchParsedFilters, WordToken } from "./defs.ts";

const RATING_PATTERNS: Array<{ re: RegExp; value: number }> = [
  { re: /(?:5|٥)\s*[- ]?(?:stars?|etoiles?|étoiles?)|★★★★★|٥ نجوم|5 نجوم|خمسة نجوم/i, value: 5 },
  { re: /4[.,]5\s*[- ]?(?:stars?|etoiles?|étoiles?)?|(?:4|٤)٫5\s*نجوم|اربعة نجوم ونصف/i, value: 4.5 },
  { re: /(?:4|٤)\s*[- ]?(?:stars?|etoiles?|étoiles?)|★★★★|اربعة نجوم|4 نجوم/i, value: 4 },
  { re: /(?:3|٣)\s*[- ]?(?:stars?|etoiles?|étoiles?)|★★★|ثلاثة نجوم|3 نجوم/i, value: 3 },
];

const OPEN_NOW = /open ?now|opens? late|ouvert(?:\s+maintenant)?|مفتوح(?: الان| الآن)?|يفتح(?: الان| الآن)?/;
const VERIFIED = /verif|verifie|verifié|certifie|certifié|موثق|معتمد/;
const PREMIUM = /\bpremium\b|مميز/;
const CHEAP = /\bcheap\b|pas cher|bon marche|bon marché|رخيص|رخيصة|اقل سعر|أقل سعر/;
const EXPENSIVE = /\bexpensive\b|couteux|coûteux|luxury|غالي|فخم/;

const PRICE_LT = /(?:moins de|under|less than|below|اقل من|أقل من)\s*(\d+)/i;
const PRICE_GT = /(?:plus de|over|more than|above|اكثر من|أكثر من)\s*(\d+)/i;

/** Canonical forms that only exist because of a consumed intent — never q. */
const TAG_TOKENS = new Set([
  "star", "stars", "etoile", "etoiles", "étoile", "étoiles", "نجوم",
  "open", "ouvert", "مفتوح", "مفتوحة", "الان", "الآن",
  "verified", "verifie", "verifié", "certifie", "certifié", "موثق", "معتمد",
  "premium", "مميز",
  "star", "stars", "خمسه", "اربعه", "أربعه", "ثلاثه", "نصف", "يفتح", "ان",
  "cheap", "pas", "cher", "bon", "marche", "marché", "رخيص", "رخيصة",
  "expensive", "couteux", "coûteux", "luxury", "غالي", "فخم",
  "moins", "under", "less", "than", "below", "over", "more", "above",
  "now", "late",
  "dh", "dhs", "mad", "درهم", "دج",
]);

const STOP_TOKENS = new Set([
  // en
  "i", "me", "my", "we", "our", "the", "a", "an", "and", "with", "for",
  "from", "by", "in", "of", "at", "on", "to", "is", "are", "be", "was",
  "have", "has", "do", "does", "it", "this", "that", "these", "those",
  "can", "could", "would", "should", "or", "but", "near", "best", "top",
  "find", "need", "want", "looking", "look", "get", "make", "your", "you",
  "her", "him", "his", "hers", "good", "service", "services", "highly",
  // fr
  "je", "veux", "cherche", "trouve", "un", "une", "des", "le", "la", "les",
  "du", "de", "d", "dans", "pour", "avec", "et", "ou", "mais", "au", "aux",
  "sur", "est", "sont", "mon", "ma", "mes", "ton", "ta", "tes", "ses",
  "nous", "vous", "il", "elle", "s", "se", "tres", "très", "bon", "bonne",
  "meilleur", "meilleure", "pres", "près", "votre",
  // ar
  "انا", "أنا", "نحن", "اني", "اريد", "أريد", "ابحث", "أبحث", "عاوز",
  "عايز", "مطلوب", "افضل", "أفضل", "في", "من", "على", "الى", "الي", "مع",
  "عن", "هذا", "هذه", "عندي", "لي",
]);

const DIGIT_ISH = /^\d/;

interface Match {
  kind: "category" | "city";
  value: string;
  start: number;
  length: number;
}

/** First longest alias whose token sequence matches an unused contiguous run. */
function findBestMatch(stream: WordToken[], used: boolean[]): Match | null {
  for (const entry of ALIAS_INDEX) {
    const k = entry.tokens.length;
    if (k === 0) continue;
    for (let i = 0; i <= stream.length - k; i += 1) {
      if (used[i]) continue;
      let ok = true;
      for (let j = 0; j < k; j += 1) {
        if (stream[i + j].norm !== entry.tokens[j]) {
          ok = false;
          break;
        }
      }
      if (ok) return { kind: entry.kind, value: entry.value, start: i, length: k };
    }
  }
  return null;
}

export function parseNaturalQuery(input: string): SearchParsedFilters {
  const raw = input.trim();
  if (!raw) return { q: "" };

  const digitCleaned = toAsciiDigits(raw);
  const found: SearchParsedFilters = { q: raw };

  // Rating first so "5 star mechanic" keeps its category intact.
  for (const { re, value } of RATING_PATTERNS) {
    if (re.test(digitCleaned)) {
      found.minRating = Math.max(found.minRating ?? 0, value);
      break;
    }
  }

  // Price hints.
  const lt = digitCleaned.match(PRICE_LT);
  const gt = digitCleaned.match(PRICE_GT);
  if (lt) found.maxPrice = Math.min(Number(lt[1]), 10000);
  else if (gt) found.minPrice = Math.min(Number(gt[1]), 10000);
  else if (CHEAP.test(digitCleaned)) found.maxPrice = 200;
  else if (EXPENSIVE.test(digitCleaned)) found.minPrice = 300;

  // Flags.
  if (OPEN_NOW.test(digitCleaned)) found.openNow = true;
  if (VERIFIED.test(digitCleaned)) found.verifiedOnly = true;
  if (PREMIUM.test(digitCleaned)) found.premiumOnly = true;

  // Neutral-order intent extraction over the token stream.
  const stream = wordStream(raw);
  const used = new Array<boolean>(stream.length).fill(false);
  for (;;) {
    const m = findBestMatch(stream, used);
    if (!m) break;
    for (let j = 0; j < m.length; j += 1) used[m.start + j] = true;
    if (m.kind === "city") found.city = m.value;
    else found.category = m.value;
  }

  // Residual query: accent-preserving original words, minus tags/stopwords.
  const residual: string[] = [];
  for (let i = 0; i < stream.length; i += 1) {
    if (used[i]) continue;
    const n = stream[i].norm;
    if (DIGIT_ISH.test(n)) continue;
    if (TAG_TOKENS.has(n) || STOP_TOKENS.has(n)) continue;
    residual.push(stream[i].orig.toLowerCase());
  }
  found.q = residual.join(" ");

  return found;
}