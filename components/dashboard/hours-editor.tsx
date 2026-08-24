"use client";

import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/translations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type HourRow = {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
};

const DAY_LABELS: Record<Locale, [string, string, string, string, string, string, string]> = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  fr: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
  ar: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
};

function emptyWeek(): HourRow[] {
  return Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    open_time: "09:00",
    close_time: "18:00",
    is_closed: false,
  }));
}

type Props = {
  value: HourRow[];
  onChange: (value: HourRow[]) => void;
  locale: Locale;
};

export function HoursEditor({ value, onChange, locale }: Props) {
  const t = useTranslations("dashboard");
  const labels = DAY_LABELS[locale] ?? DAY_LABELS.en;

  function setRow(index: number, patch: Partial<HourRow>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-2">
      {value.map((row, index) => (
        <div key={row.day_of_week} className="flex flex-wrap items-center gap-3">
          <span className="w-24 shrink-0 text-sm font-medium">{labels[index]}</span>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={row.is_closed}
              onChange={(e) => setRow(index, { is_closed: e.target.checked })}
              className="h-4 w-4"
            />
            {t("hoursClosed")}
          </label>
          <Input
            type="time"
            dir="ltr"
            disabled={row.is_closed}
            value={row.open_time ?? ""}
            onChange={(e) => setRow(index, { open_time: e.target.value || null })}
            className="w-32"
            aria-label={`${labels[index]} ${t("hoursOpen")}`}
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="time"
            dir="ltr"
            disabled={row.is_closed}
            value={row.close_time ?? ""}
            onChange={(e) => setRow(index, { close_time: e.target.value || null })}
            className="w-32"
            aria-label={`${labels[index]} ${t("hoursClose")}`}
          />
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={() => onChange(emptyWeek())}>
        {t("resetHours")}
      </Button>
    </div>
  );
}

export { emptyWeek };
