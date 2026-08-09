"use client";

import { motion } from "framer-motion";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SmartImage } from "@/components/smart-image";
import { DEFAULT_PLACEHOLDER_IMAGES } from "@/lib/constants";
import { localizedName, type Locale } from "@/lib/translations";
import {
  formatTime,
  hoursForDay,
  isOpenNow,
  nextOpenLabel,
} from "@/lib/hours";
import type { BusinessDetail } from "@/lib/queries";
import { QuickActions } from "./quick-actions";
import { cn } from "@/lib/utils";

export function BusinessHero({ business }: { business: BusinessDetail }) {
  const t = useTranslations("business");
  const locale = useLocale() as Locale;

  const open = isOpenNow(business.hours);
  const today = hoursForDay(business.hours, new Date().getDay());
  const next = nextOpenLabel(business.hours);

  return (
    <section>
      {/* Cover */}
      <div className="relative flex min-h-[300px] w-full flex-col justify-end overflow-hidden bg-muted sm:min-h-[360px] md:min-h-[440px]">
        <div className="absolute inset-0">
          <SmartImage
            src={business.cover_url}
            alt={business.name}
            fallback={DEFAULT_PLACEHOLDER_IMAGES.cover}
            sizes="100vw"
            className="h-full w-full"
          />
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/5"
        />

        {/* Identity block — white text ONLY over the image */}
        <div className="relative z-10">
          <div className="container-site pb-6 md:pb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col gap-4 md:flex-row md:items-end md:gap-5"
            >
              <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl border-4 border-background bg-card shadow-lift md:size-28">
                <SmartImage
                  src={business.logo_url}
                  alt={`${business.name} logo`}
                  fallback={DEFAULT_PLACEHOLDER_IMAGES.logo}
                  className="size-full"
                  imgClassName="object-cover"
                />
              </div>

              <div className="min-w-0 flex-1 pb-1 text-white">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <h1 className="min-w-0 break-words text-3xl font-bold leading-tight drop-shadow-md sm:text-3xl md:text-4xl">
                    {business.name}
                  </h1>
                  {business.verified && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-foreground/80 px-2 py-0.5 text-[11px] font-semibold text-background backdrop-blur">
                      <BadgeCheck className="size-3.5" />
                      {t("verified")}
                    </span>
                  )}
                  {(business.plan === "premium" || business.plan === "pro") && (
                    <span className="inline-flex items-center rounded-md border border-white/40 bg-white/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white backdrop-blur">
                      {business.plan === "premium" ? "Premium" : "Pro"}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-white/90">
                  {business.categories && (
                    <span className="inline-flex items-center gap-1.5 font-medium text-white">
                      {localizedName(business.categories, locale)}
                    </span>
                  )}
                  {business.city && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5" />
                      {business.city}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="size-3.5 fill-amber-300 text-amber-300" />
                    <span className="font-semibold text-white">
                      {business.rating_avg > 0 ? business.rating_avg.toFixed(1) : "—"}
                    </span>
                    <span className="text-white/80">
                      ({business.reviews_count})
                    </span>
                  </span>
                </div>

                {business.hours.length > 0 && (
                  <div className="mt-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium backdrop-blur",
                        open
                          ? "bg-success/85 text-white"
                          : "bg-black/30 text-white",
                      )}
                    >
                      <span className="relative flex size-1.5">
                        <span className="relative inline-flex size-1.5 rounded-full bg-current" />
                      </span>
                      {open
                        ? today?.close_time
                          ? t("closesAt", {
                              time: formatTime(today.close_time, locale),
                            })
                          : t("openNow")
                        : next
                          ? t("opensAt", { time: formatTime(next.time, locale) })
                          : t("closedToday")}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Action band — normal light page content, no overlay styles leak here */}
      <div className="border-b border-border bg-background">
        <div className="container-site py-4">
          <QuickActions business={business} locale={locale} />
        </div>
      </div>
    </section>
  );
}