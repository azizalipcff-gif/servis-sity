import { MOROCCAN_CITIES } from "@/lib/constants";
import type { ParsedFilters } from "./types";

/**
 * Deterministic natural-language → filter parser. Used as an offline
 * fallback for the AI search so the feature works without any API key,
 * and as a safety net even when AI is configured.
 *
 * Examples:
 *   "electrician near me"                     -> { q:"electrician", category:"electricien" }
 *   "best dentist in Casablanca"              -> { q:"best dentist", city:"Casablanca", category:"dentiste" }
 *   "cheap mechanic open now"                 -> { q:"cheap mechanic", category:"mecanicien", openNow:true, maxPrice:200 }
 *   "hair salon with 5 star reviews"          -> { q:"hair salon", category:"coiffeur", minRating:5 }
 *   "verified premium restaurant in Marrakech"-> { q:"restaurant", city:"Marrakech", category:"restaurant", verifiedOnly:true, premiumOnly:true }
 */

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  electricien: ["electricien", "electrician", "كهربائي", "كهرباء"],
  plombier: ["plombier", "plumber", "سباك", "سباكة"],
  restaurant: ["restaurant", "resto", "مطعم", "اكل"],
  coiffeur: [
    "coiffeur",
    "coiffure",
    "hair salon",
    "hairdresser",
    "barber",
    "coiffeur",
    "حلاق",
    "كوافور",
    "صالون حلاقة",
  ],
  mecanicien: ["mecanicien", "mecanique", "mechanic", "garage", "ميكانيكي", "ميكانيك"],
  menuiserie: ["menuiserie", "menuisier", "carpenter", "نجار", "نجارة"],
  peintre: ["peintre", "painter", "صباغ", "صباغة"],
  pharmacie: ["pharmacie", "pharmacy", "صيدلية"],
  medecin: ["medecin", "doctor", "docteur", "طبيب", "دكتور"],
  dentiste: ["dentiste", "dentist", "اسنان", "طبيب اسنان"],
  avocat: ["avocat", "lawyer", "محامي"],
  transport: ["transport", "taxi", "livraison", "delivery", "توصيل", "نقل"],
  nettoyage: ["nettoyage", "cleaning", "cleaner", "تنظيف"],
  immobilier: ["immobilier", "real estate", "agent", "عقار", "عقارات"],
  scolaire: ["ecole", "school", "cours", "مدرسة", "دروس"],
};

const CITY_ALIASES: Record<string, string[]> = {
  Casablanca: ["casablanca", "casa", "casa blanca", "الدار البيضاء", "كازا"],
  Rabat: ["rabat", "الرباط"],
  Marrakech: ["marrakech", "مراكش"],
  "Fès": ["fes", "fès", "فاس"],
  Tanger: ["tanger", "tangier", "طنجة"],
  Agadir: ["agadir", "أكادير", "اكادير"],
  Meknès: ["meknes", "meknès", "مكناس"],
  Oujda: ["oujda", "وجدة"],
  Kenitra: ["kenitra", "القنيطرة"],
  Tétouan: ["tetouan", "tétouan", "تطوان"],
  Salé: ["sale", "salé", "سلا"],
  Mohammedia: ["mohammedia", "المحمدية"],
  "El Jadida": ["el jadida", "الجديدة"],
  Nador: ["nador", "الناظور"],
  "Béni Mellal": ["beni mellal", "béni mellal", "بني ملال"],
  Laâyoune: ["laayoune", "laâyoune", "العيون"],
  Dakhla: ["dakhla", "الداخلة"],
  Essaouira: ["essaouira", "الصويرة"],
  Taza: ["taza", "تازة"],
  Safi: ["safi", "آسفي"],
};

const RATING_TOKENS: Array<[RegExp, number]> = [
  [/5\s*(?:stars?|etoiles|étoiles)?|★★★★★|خمسة نجوم|5 نجوم/i, 5],
  [/4\.5|4\s*(?:stars?|etoiles|étoiles)|★★★★|اربعة نجوم|4 نجوم/i, 4.5],
  [/4\s*(?:stars?|etoiles|étoiles)?|★★★★|4 نجوم/i, 4],
  [/3\s*(?:stars?|etoiles|étoiles)?|★★★|3 نجوم/i, 3],
];

/**
 * Lightweight city extraction for plain-text search. When the raw query
 * mentions a known Moroccan city it returns the canonical display name (e.g.
 * "Casablanca", "Fès") plus the query with that token removed, so the rest can
 * be matched against names/descriptions. Matching is word-bounded so "sale"
 * inside "salesman" never false-positives on the city Salé.
 */
export function inferCityFromQuery(input: string): {
  city: string | null;
  query: string;
} {
  const raw = (input ?? "").trim();
  if (!raw) return { city: null, query: raw };

  const lowered = raw.toLowerCase();
  let best: { city: string; alias: string } | null = null;
  for (const [city, aliases] of Object.entries(CITY_ALIASES)) {
    for (const alias of aliases) {
      if (wordHit(lowered, alias) && (!best || alias.length > best.alias.length)) {
        best = { city, alias };
      }
    }
  }
  if (!best) return { city: null, query: raw };

  const query = raw
    .replace(new RegExp(escapeRegExp(best.alias), "gi"), " ")
    .replace(/\s+/g, " ")
    .trim();
  return { city: best.city, query };
}

function wordHit(text: string, needle: string): boolean {
  const len = needle.length;
  if (len === 0) return false;
  let from = 0;
  for (;;) {
    const i = text.indexOf(needle, from);
    if (i === -1) return false;
    const before = text[i - 1];
    const after = text[i + len];
    if (
      (!before || !/\p{L}|\p{N}/u.test(before)) &&
      (!after || !/\p{L}|\p{N}/u.test(after))
    ) {
      return true;
    }
    from = i + 1;
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseNaturalQuery(input: string): ParsedFilters {
  const raw = input.trim();
  if (!raw) return { q: "" };

  const lowered = raw.toLowerCase();
  const found: ParsedFilters = { q: raw };
  let cleaned = lowered;

  // City — longest alias first to avoid "sale" clashing with generic words.
  const cityMatches: Array<{ city: string; alias: string }> = [];
  for (const [city, aliases] of Object.entries(CITY_ALIASES)) {
    for (const alias of aliases) {
      if (lowered.includes(alias)) cityMatches.push({ city, alias });
    }
  }
  cityMatches.sort((a, b) => b.alias.length - a.alias.length);
  if (cityMatches[0]) {
    found.city = cityMatches[0].city;
    cleaned = cleaned.replace(cityMatches[0].alias, " ");
  }

  // Category — longest keyword first.
  let bestCategory: { slug: string; word: string } | null = null;
  for (const [slug, words] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const word of words) {
      if (lowered.includes(word) && (!bestCategory || word.length > bestCategory.word.length)) {
        bestCategory = { slug, word };
      }
    }
  }
  if (bestCategory) {
    found.category = bestCategory.slug;
    cleaned = cleaned.replace(bestCategory.word, " ");
  }

  // Rating.
  for (const [re, rating] of RATING_TOKENS) {
    if (re.test(lowered)) {
      found.minRating = Math.max(found.minRating ?? 0, rating);
      cleaned = cleaned.replace(re, " ");
      break;
    }
  }

  // Flags.
  if (/open ?now|ouvert|مفتوح الان|مفتوح/.test(lowered)) {
    found.openNow = true;
    cleaned = cleaned.replace(/open ?now|ouvert|مفتوح الان|مفتوح/g, " ");
  }
  if (/verif|موثق|معتمد/.test(lowered)) {
    found.verifiedOnly = true;
  }
  if (/\bpremium\b|pro\b|مميز/.test(lowered)) {
    found.premiumOnly = true;
  }

  // Price hints (heuristic bands).
  if (/\bcheap\b|pas cher|bon marche|رخيص|رخيصة/.test(lowered)) {
    found.maxPrice = 200;
    cleaned = cleaned.replace(/\bcheap\b|pas cher|bon marche|رخيص|رخيصة/g, " ");
  } else if (/\bexpensive\b|couteux|luxury|غالي|فخم/.test(lowered)) {
    found.minPrice = 300;
    cleaned = cleaned.replace(/\bexpensive\b|couteux|luxury|غالي|فخم/g, " ");
  }

  // Clean up filler words and noise.
  cleaned = cleaned
    .replace(/\b(i need|i want|looking for|find|best|near me|with|and|the|a|an)\b/g, " ")
    .replace(/[^a-z\u0600-\u06FF0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  found.q = cleaned || "";
  return found;
}

export function suggestCities(prefix: string, limit = 6): string[] {
  const p = prefix.toLowerCase();
  return MOROCCAN_CITIES.filter((c) => c.toLowerCase().startsWith(p)).slice(0, limit);
}