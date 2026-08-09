import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import {
  formatTime,
  formatTimeRange,
  hoursForDay,
  isOpenNow,
  weekdayName,
} from "@/lib/hours";
import type { BusinessDetail } from "@/lib/queries";

export async function OpeningHoursSection({
  business,
  locale,
}: {
  business: BusinessDetail;
  locale: "ar" | "fr" | "en";
}) {
  const t = await getTranslations("business");

  if (business.hours.length === 0) return null;

  const now = new Date();
  const todayIndex = now.getDay();
  const today = hoursForDay(business.hours, todayIndex);
  const open = isOpenNow(business.hours, now);

  return (
    <section aria-label={t("hours")}>
      <div className="flex items-baseline gap-2.5">
        <h2 className="text-lg font-semibold tracking-tight">{t("hours")}</h2>
      </div>

      <div
        className={cn(
          "mt-4 overflow-hidden rounded-2xl border",
          open ? "border-success/30" : "border-border",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-3 px-5 py-3",
            open
              ? "bg-success/10 text-success"
              : "bg-muted/40 text-muted-foreground",
          )}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className="relative flex size-2.5">
              {open && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-70" />
              )}
              <span className="relative inline-flex size-2.5 rounded-full bg-current" />
            </span>
            {open ? t("openNow") : t("closed")}
          </span>
          <span className="text-sm text-muted-foreground">
            {today && !today.is_closed && today.close_time
              ? t(open ? "closesAt" : "opensAt", {
                  time: formatTime(
                    (open ? today.close_time : today.open_time) ?? "00:00",
                    locale,
                  ),
                })
              : t("closedToday")}
          </span>
        </div>

        <div className="divide-y">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => {
            const hour = business.hours.find((h) => h.day_of_week === day);
            const isToday = day === todayIndex;
            return (
              <div
                key={day}
                className={cn(
                  "flex items-center justify-between px-5 py-2.5 text-sm",
                  isToday ? "bg-primary/5 font-semibold" : "bg-background",
                )}
              >
                <span
                  className={cn(
                    "flex items-center gap-2",
                    isToday && "text-primary",
                  )}
                >
                  {weekdayName(day, locale)}
                  {isToday && (
                    <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">
                      {t("today")}
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground">
                  {!hour || hour.is_closed
                    ? "—"
                    : formatTimeRange(hour.open_time, hour.close_time, locale)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}