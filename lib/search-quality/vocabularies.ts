/**
 * Multilingual vocabularies for the deterministic search-quality pipeline.
 *
 * Every alias is a RAW surface string (any of ar/fr/en, original accents).
 * At load time each alias is canonicalized into a token sequence and stored in
 * a flat, desc-length index so the parser can pick the LONGEST match first —
 * that is what makes parsing neutral to the order the user writes city /
 * category / flags in, and it keeps short ambiguous words (casa, sale) from
 * shadowing their long-form meanings.
 */

import { canonicalTokens } from "./normalize.ts";

export interface CategoryEntry {
  slug: string;
  aliases: string[];
}

export interface CityEntry {
  /** Display name — matches the value used by business cards / filters. */
  name: string;
  aliases: string[];
}

export interface AliasEntry {
  kind: "category" | "city";
  value: string;
  alias: string;
  tokens: string[];
}

export const CATEGORIES: CategoryEntry[] = [
  {
    slug: "electricien",
    aliases: [
      "electrician", "electricians", "electricien", "électricien",
      "electriciens", "électriciens", "electric", "electrique", "électrique",
      "electricite", "électricité", "electricity", "كهرباء", "كهربائي",
      "كهربائية", "كهربائيين", "كهربا",
    ],
  },
  {
    slug: "plombier",
    aliases: [
      "plumber", "plumbers", "plombier", "plombiers", "plomberie",
      "plumbing", "سباك", "سباكين", "سباكة", "سباكه",
    ],
  },
  {
    slug: "peintre",
    aliases: [
      "painter", "painters", "paint", "paints", "painting", "peintre",
      "peintres", "peinture", "peinturer", "صباغ", "صباغين", "صباغة", "صباغه",
      "دهان", "دهانون", "طلاء",
    ],
  },
  {
    slug: "restaurant",
    aliases: [
      "restaurant", "restaurants", "resto", "restos", "restau", "مطعم",
      "مطاعم", "اكل", "طعام",
    ],
  },
  {
    slug: "menuiserie",
    aliases: [
      "carpentry", "carpenter", "carpenters", "menuisier", "menuisiers",
      "menuiserie", "woodwork", "نجار", "نجارين", "نجارة", "نجاره",
    ],
  },
  {
    slug: "mecanicien",
    aliases: [
      "mechanic", "mechanics", "mecanicien", "mécanicien", "mecanique",
      "mécanique", "garage", "garage auto", "car repair", "car repairs",
      "auto repair", "auto repairs", "ميكانيكي", "ميكانيكيين", "ميكانيك",
      "ميكانيكا",
    ],
  },
  {
    slug: "medecin",
    aliases: [
      "doctor", "doctors", "docteur", "docteurs", "medecin", "médecin",
      "médecins", "medecine", "médecine", "general practitioner", "طبيب",
      "اطباء", "أطباء", "دكتور",
    ],
  },
  {
    slug: "coiffeur",
    aliases: [
      "barber", "barbers", "barber shop", "barbershop", "hairdresser",
      "hairdressers", "hair salon", "hairdressing", "coiffeur", "coiffeurs",
      "coiffeuse", "coiffure", "salon de coiffure", "حلاق", "حلاقون", "حلاقة",
      "كوافير", "كوافور", "صالون", "صالون حلاقة",
    ],
  },
  {
    slug: "professeur",
    aliases: [
      "tutor", "tutors", "private tutor", "private tutors", "teacher",
      "teachers", "professor", "professeur", "professeurs",
      "professeur particulier", "professeurs particuliers", "cours particulier",
      "cours particuliers", "cours", "أستاذ", "أساتذة", "استاذ", "معلم",
      "معلمين", "مدرس", "مدرسين", "دروس خصوصية", "دروس",
    ],
  },
  {
    slug: "nettoyage",
    aliases: [
      "cleaning", "cleaner", "cleaners", "cleaning company",
      "house cleaning", "menage", "ménage", "nettoyage", "معامل تنظيف",
      "تنظيف", "نظافة", "عامل تنظيف", "شركة تنظيف",
    ],
  },
  {
    slug: "cafe",
    aliases: [
      "cafe", "cafes", "café", "cafés", "coffee", "coffee shop",
      "coffeehouse", "coffee house", "مقهى", "قهوة", "كافيه", "مقاهي",
    ],
  },
  {
    slug: "photographe",
    aliases: [
      "photographer", "photographers", "photographe", "photographes",
      "photographie", "photography", "photo", "مصور", "مصورين",
      "مصور فوتوغرافي", "تصوير", "فوتوغرافيا",
    ],
  },
  {
    slug: "maintenance",
    aliases: [
      "maintenance", "entretien", "entretenir", "صيانة", "صيانة عامة",
      "صيانه",
    ],
  },
  {
    slug: "equipment",
    aliases: [
      "equipment", "equipement", "équipement", "équipements", "materiel",
      "matériel", "معدات", "معدات مهنية",
    ],
  },
  {
    slug: "repair",
    aliases: [
      "repair", "repairs", "reparation", "réparation", "réparations", "fix",
      "fixing", "اصلاح", "إصلاح", "تصليح", "تصليحات",
    ],
  },
  {
    slug: "construction",
    aliases: [
      "construction", "building", "renovation", "renovate", "renovations",
      "rénovation", "contractor", "contractors", "بناء", "بنائين", "بيم",
      "اشغال", "أشغال", "مقاول", "مقاولات", "مقاولون",
    ],
  },
  {
    slug: "macaroute",
    aliases: [
      "mason", "masons", "masonry", "maçon", "maçons", "maçonnerie",
      "حجار", "حجارة", "حجري",
    ],
  },
  {
    slug: "sante-pharmacie",
    aliases: [
      "pharmacy", "pharmacies", "pharmacist", "pharmacie", "pharmacien",
      "صيدلية", "صيدليات", "صيدلي", "صيدلانية",
    ],
  },
  {
    slug: "informatique-dev",
    aliases: [
      "developer", "developers", "web developer", "software developer",
      "software development", "web developpeur", "developpeur", "développeur",
      "développeurs", "codeur", "programming", "programmation", "برمجة",
      "مبرمج", "مبرمجين", "مطور", "مطورين", "تطوير", "مواقع ويب",
    ],
  },
  {
    slug: "informatique",
    aliases: [
      "informatique", "computer", "computers", "computer repair",
      "repair computer", "reparation informatique", "réparation informatique",
      "it services", "ordi", "كمبيوتر", "حاسوب", "معلوميات", "تكنولوجيا",
      "اصلاح كمبيوتر",
    ],
  },
  {
    slug: "media-video",
    aliases: [
      "videographer", "videographers", "videaste", "vidéaste", "videastes",
      "filmmaking", "video production", "مصور فيديو", "فيديو", "منتج فيديو",
      "مونتاج",
    ],
  },
  {
    slug: "beaute",
    aliases: [
      "spa", "spas", "hammam", "hammams", "massage", "institut de beaute",
      "institut de beauté", "beaute", "beauté", "manicure", "pedicure",
      "masseur", "سبا", "مساج", "ماساج", "حمام", "حمام مغربي",
      "صالون تجميل", "تجميل",
    ],
  },
  {
    slug: "sante",
    aliases: [
      "clinic", "clinics", "clinique", "cliniques", "health", "medicine",
      "medical", "medical center", "medical centre", "sante", "santé",
      "dentist", "dentists", "dentiste", "dentistes", "عيادة", "عيادات",
      "مركز صحي", "مركز طبي", "مستشفى", "مستشفيات", "مستوصف", "طبيب اسنان",
      "طبيب أسنان", "اسنان", "أسنان",
    ],
  },
  {
    slug: "education",
    aliases: [
      "school", "schools", "ecole", "école", "cours de soutien",
      "soutien scolaire", "private lessons", "مدرسة", "مدارس", "تعليم",
      "دروس الدعم",
    ],
  },
  {
    slug: "immobilier",
    aliases: [
      "real estate", "realtor", "real estate agent", "real estate agency",
      "immobilier", "agent immobilier", "agence immobiliere",
      "agence immobilière", "immobiliere", "property", "apartment",
      "apartments", "appartement", "appartements", "فيلا", "فلل", "شقة", "شقق",
      "عقار", "عقارات", "مكتب عقاري", "ارض", "أرض", "أراض", "دلال",
    ],
  },
  {
    slug: "auto-services",
    aliases: [
      "car services", "auto services", "car wash", "lavage", "lavage auto",
      "detailing", "delivery", "livraison", "taxi", "توصيل", "نقل",
      "غسيل سيارات", "تلميع",
    ],
  },
  {
    slug: "ménager-services",
    aliases: [
      "aide menagere", "aide ménagère", "housemaid", "maid", "housekeeper",
      "gardener", "jardinier", "pool cleaning", "entretien piscine",
      "عاملة", "عاملة منزلية", "مدبرة منزل", "بستاني", "تنظيف منزل",
    ],
  },
  {
    slug: "artisanat",
    aliases: [
      "handicraft", "artisanat", "artisanal", "pottery", "poterie", "couture",
      "jewelry", "bijoux", "leather", "cuir", "حرف", "حرف يدوية",
    ],
  },
  {
    slug: "artisanat-cuisine",
    aliases: [
      "culinary", "culinaire", "artisanat culinaire", "produit artisanal",
      "حلويات", "طبخ تقليدي",
    ],
  },
  {
    slug: "services-pro",
    aliases: [
      "consultant", "consultants", "consulting", "professional services",
      "bureau d'etudes", "bureau d'études", "accountant", "accountants",
      "comptable", "lawyer", "lawyers", "avocat", "avocats", "محاسب",
      "محاسبون", "استشاري", "استشارات", "محامي", "محامين", "خبير",
    ],
  },
  {
    slug: "restaurants",
    aliases: [
      "restaurants and bars", "restaurants & bars",
    ],
  },
];

export const CITIES: CityEntry[] = [
  { name: "Casablanca", aliases: ["casablanca", "casa blanca", "casablance", "casa", "الدار البيضاء", "دار البيضاء", "كازا", "الدارالبيضاء"] },
  { name: "Rabat", aliases: ["rabat", "الرباط"] },
  { name: "Marrakech", aliases: ["marrakech", "marakesh", "marrakesh", "مراكش"] },
  { name: "Fès", aliases: ["fes", "fès", "فاس"] },
  { name: "Tanger", aliases: ["tanger", "tangier", "طنجة"] },
  { name: "Agadir", aliases: ["agadir", "اغادير", "أغادير", "اكادير", "أكادير"] },
  { name: "Meknès", aliases: ["meknes", "meknès", "مكناس"] },
  { name: "Oujda", aliases: ["oujda", "وجدة"] },
  { name: "Kenitra", aliases: ["kenitra", "kénitra", "kinitra", "القنيطرة", "قنيطرة"] },
  { name: "Tétouan", aliases: ["tetouan", "tétouan", "تطوان"] },
  { name: "Salé", aliases: ["sale", "salé", "سلا"] },
  { name: "Mohammedia", aliases: ["mohammedia", "المحمدية"] },
  { name: "El Jadida", aliases: ["el jadida", "jadida", "الجديدة"] },
  { name: "Nador", aliases: ["nador", "الناظور"] },
  { name: "Béni Mellal", aliases: ["beni mellal", "béni mellal", "بني ملال"] },
  { name: "Laâyoune", aliases: ["laayoune", "laâyoune", "el aaiun", "العيون"] },
  { name: "Dakhla", aliases: ["dakhla", "الداخلة"] },
  { name: "Essaouira", aliases: ["essaouira", "الصويرة", "سويرة"] },
  { name: "Taza", aliases: ["taza", "تازة"] },
  { name: "Safi", aliases: ["safi", "اسفي", "آسفي"] },
  { name: "Berkane", aliases: ["berkane", "بركان"] },
];

/**
 * Flat alias index, sorted longest-first (token count, then raw length), with
 * city ties favored so short city words (casa, sale) win over equal-length
 * category words. The parser scans this list once per phase.
 */
export function buildAliasIndex(): AliasEntry[] {
  const entries: AliasEntry[] = [];
  for (const c of CATEGORIES) {
    for (const a of c.aliases) {
      entries.push({ kind: "category", value: c.slug, alias: a, tokens: canonicalTokens(a) });
    }
  }
  for (const city of CITIES) {
    // The canonical display name must resolve too ("Casablanca" typed alone).
    entries.push({ kind: "city", value: city.name, alias: city.name, tokens: canonicalTokens(city.name) });
    for (const a of city.aliases) {
      entries.push({ kind: "city", value: city.name, alias: a, tokens: canonicalTokens(a) });
    }
  }
  entries.sort((x, y) => {
    if (x.tokens.length !== y.tokens.length) return y.tokens.length - x.tokens.length;
    if (x.alias.length !== y.alias.length) return y.alias.length - x.alias.length;
    if (x.kind !== y.kind) return x.kind === "city" ? -1 : 1;
    return 0;
  });
  return entries;
}

export const ALIAS_INDEX = buildAliasIndex();