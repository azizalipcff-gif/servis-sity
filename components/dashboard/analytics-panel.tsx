"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import type { AnalyticsSummary } from "@/lib/queries";

export function AnalyticsPanel({
  analytics,
  bookingsCount = 0,
}: {
  analytics: AnalyticsSummary;
  bookingsCount?: number;
}) {
  const t = useTranslations("dashboard.dash");

  const max = useMemo(
    () => Math.max(1, ...analytics.series.map((s) => s.views)),
    [analytics.series],
  );

  const stats = [
    { label: t("visitors"), value: analytics.views },
    { label: t("leads"), value: analytics.leads },
    { label: t("whatsappClicks"), value: analytics.whatsapp_clicks },
    { label: t("callClicks"), value: analytics.call_clicks },
    { label: t("photoViews"), value: analytics.photo_views },
    { label: t("bookingsReceived"), value: bookingsCount },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border bg-card p-4"
          >
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">
              {s.value}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-3xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t("views")}</h3>
          <span className="text-xs text-muted-foreground">
            {t("last14")}
          </span>
        </div>
        <div className="mt-4 flex h-40 items-end gap-1.5">
          {analytics.series.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("recent")}</p>
          )}
          {analytics.series.map((s) => (
            <div
              key={s.date}
              className="flex flex-1 flex-col items-center gap-1"
              title={`${s.date}: ${s.views}`}
            >
              <div className="relative w-full flex-1">
                <div className="absolute inset-0 flex items-end">
                  <div
                    className="w-full rounded-t bg-primary/70 transition-all"
                    style={{ height: `${(s.views / max) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {new Date(s.date + "T00:00:00").getDate()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}