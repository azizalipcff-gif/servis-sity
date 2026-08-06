export type Hour = {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
};

export function hoursForDay(
  hours: Hour[],
  dayOfWeek: number,
): Hour | undefined {
  return hours.find((h) => h.day_of_week === dayOfWeek);
}

export function isOpenNow(
  hours: Hour[],
  now: Date = new Date(),
): boolean {
  const h = hoursForDay(hours, now.getDay());
  if (!h || h.is_closed || !h.open_time || !h.close_time) return false;
  const cur = now.toTimeString().slice(0, 5);
  return cur >= h.open_time && cur <= h.close_time;
}

export function nextOpenLabel(
  hours: Hour[],
  now: Date = new Date(),
): { day: number; time: string } | null {
  for (let i = 0; i < 7; i++) {
    const day = (now.getDay() + i) % 7;
    const h = hoursForDay(hours, day);
    if (h && !h.is_closed && h.open_time) {
      return { day, time: h.open_time };
    }
  }
  return null;
}

export function formatTimeRange(
  open: string | null,
  close: string | null,
  locale: string,
): string {
  const fmt = (t: string | null) =>
    t ? formatTime(t, locale) : "—";
  return `${fmt(open)} – ${fmt(close)}`;
}

export function formatTime(time: string, locale: string): string {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: locale !== "fr" && locale !== "en",
  }).format(new Date(2000, 0, 1, h, m));
}

export const WEEKDAY_SHORT: Record<string, { ar: string; fr: string; en: string }> = {
  0: { ar: "الأحد", fr: "Dimanche", en: "Sunday" },
  1: { ar: "الاثنين", fr: "Lundi", en: "Monday" },
  2: { ar: "الثلاثاء", fr: "Mardi", en: "Tuesday" },
  3: { ar: "الأربعاء", fr: "Mercredi", en: "Wednesday" },
  4: { ar: "الخميس", fr: "Jeudi", en: "Thursday" },
  5: { ar: "الجمعة", fr: "Vendredi", en: "Friday" },
  6: { ar: "السبت", fr: "Samedi", en: "Saturday" },
};

export function weekdayName(day: number, locale: string): string {
  return WEEKDAY_SHORT[day]?.[locale as "ar" | "fr" | "en"] ?? "";
}
