const ARABIC_SPECIALS: Record<string, string> = {
  "أ": "a",
  "إ": "a",
  "آ": "a",
  "ا": "a",
  "ب": "b",
  "ت": "t",
  "ث": "th",
  "ج": "j",
  "ح": "h",
  "خ": "kh",
  "د": "d",
  "ذ": "dh",
  "ر": "r",
  "ز": "z",
  "س": "s",
  "ش": "sh",
  "ص": "s",
  "ض": "d",
  "ط": "t",
  "ظ": "z",
  "ع": "a",
  "غ": "gh",
  "ف": "f",
  "ق": "q",
  "ك": "k",
  "ل": "l",
  "م": "m",
  "ن": "n",
  "ه": "h",
  "و": "w",
  "ي": "y",
  "ة": "a",
  "ى": "a",
  "ؤ": "o",
  "ئ": "e",
};

const FRENCH_SPECIALS: Record<string, string> = {
  "é": "e",
  "è": "e",
  "ê": "e",
  "ë": "e",
  "à": "a",
  "â": "a",
  "ä": "a",
  "î": "i",
  "ï": "i",
  "ô": "o",
  "ö": "o",
  "ù": "u",
  "û": "u",
  "ü": "u",
  "ç": "c",
  "œ": "oe",
  "æ": "ae",
  "ñ": "n",
};

export function slugify(input: string): string {
  let out = input.trim().toLowerCase();

  out = out.replace(/[أإآا]/g, "a");

  for (const [char, replacement] of Object.entries(ARABIC_SPECIALS)) {
    out = out.split(char).join(replacement);
  }
  for (const [char, replacement] of Object.entries(FRENCH_SPECIALS)) {
    out = out.split(char).join(replacement);
  }

  out = out
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return out || `business-${Date.now()}`;
}
