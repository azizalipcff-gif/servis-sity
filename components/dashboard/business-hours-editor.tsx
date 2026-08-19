"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { weekdayName } from "@/lib/hours";
import type { BusinessDetail } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type HourRow = NonNullable<BusinessDetail["hours"]>[number];

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export function BusinessHoursEditor({ business }: { business: BusinessDetail }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const router = useRouter();

  const [rows, setRows] = useState<HourRow[]>(() => {
    const byDay = new Map((business.hours ?? []).map((h) => [h.day_of_week, h]));
    return DAYS.map((day) => {
      const existing = byDay.get(day);
      if (existing) return existing;
      return {
        id: "",
        business_id: business.id,
        day_of_week: day,
        open_time: null,
        close_time: null,
        is_closed: true,
      };
    });
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function patch(day: number, update: Partial<HourRow>) {
    setRows((prev) => prev.map((r) => (r.day_of_week === day ? { ...r, ...update } : r)));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("business_hours")
        .delete()
        .eq("business_id", business.id);
      if (deleteError) throw deleteError;

      const payload = rows.map((r) => ({
        business_id: business.id,
        day_of_week: r.day_of_week,
        open_time: r.is_closed ? null : r.open_time || null,
        close_time: r.is_closed ? null : r.close_time || null,
        is_closed: r.is_closed,
      }));
      const { error: insertError } = await supabase
        .from("business_hours")
        .insert(payload);
      if (insertError) throw insertError;

      setSaved(true);
      router.refresh();
    } catch {
      setError(t("hoursError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("hours")}</CardTitle>
        <CardDescription>{t("hoursHint")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.day_of_week}
            className="flex flex-wrap items-center gap-3 rounded-xl border bg-background/40 px-3 py-2"
          >
            <span className="w-24 shrink-0 text-sm font-medium">
              {weekdayName(row.day_of_week, locale)}
            </span>

            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={row.is_closed}
                onChange={(e) => patch(row.day_of_week, { is_closed: e.target.checked })}
                className="h-4 w-4"
              />
              {t("hoursClosed")}
            </label>

            <div
              className={cn(
                "flex items-center gap-2",
                row.is_closed && "pointer-events-none opacity-40",
              )}
            >
              <div className="space-y-0.5">
                <Label className="text-xs text-muted-foreground">{t("hoursOpen")}</Label>
                <Input
                  type="time"
                  dir="ltr"
                  value={row.open_time ?? ""}
                  disabled={row.is_closed}
                  onChange={(e) =>
                    patch(row.day_of_week, { open_time: e.target.value || null })
                  }
                  className="h-9 w-32"
                />
              </div>
              <div className="space-y-0.5">
                <Label className="text-xs text-muted-foreground">{t("hoursClose")}</Label>
                <Input
                  type="time"
                  dir="ltr"
                  value={row.close_time ?? ""}
                  disabled={row.is_closed}
                  onChange={(e) =>
                    patch(row.day_of_week, { close_time: e.target.value || null })
                  }
                  className="h-9 w-32"
                />
              </div>
            </div>
          </div>
        ))}

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {saved && (
          <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            {t("hoursSaved")}
          </p>
        )}

        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          {t("saveHours")}
        </Button>
      </CardContent>
    </Card>
  );
}
