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
    <section className="relative">
      {/* Cover */}
      <div className="relative h-[260px] w-full overflow-hidden bg-muted sm:h-[340px] md:h-[400px]">
        <SmartImage
          src={business.cover_url}
          alt={business.name}
          fallback={DEFAULT_PLACEHOLDER_IMAGES.cover}
          sizes="100vw"
          className="h-full w-full"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10"
        />
      </div>

      {/* Identity card */}
      <div className="container-site">
        <div className="relative z-10 -mt-16 md:-mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col gap-4 md:flex-row md:items-end"
          >
            <div className="relative size-28 shrink-0 overflow-hidden rounded-3xl border-4 border-background bg-card shadow-2xl md:size-32">
              <SmartImage
                src={business.logo_url}
                alt={`${business.name} logo`}
                fallback={DEFAULT_PLACEHOLDER_IMAGES.logo}
                fill={false}
                imgClassName="size-full object-cover"
              />
            </div>

            <div className="max-w-3xl pb-1 text-white">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-3xl font-bold tracking-tight drop-shadow-sm md:text-4xl">
                  {business.name}
                </h1>
                {business.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                    <BadgeCheck className="size-3.5" />
                    {t("verified")}
                  </span>
                )}
                {business.plan !== "free" && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white",
                      business.plan === "premium"
                        ? "bg-primary"
                        : "bg-[#45489b]",
                    )}
                  >
                    {business.plan === "pro" ? "Pro" : "Premium"}
                  </span>
                )}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                {business.categories && (
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    {localizedName(business.categories, locale)}
                  </span>
                )}
                {business.city && (
                  <span className="inline-flex items-center gap-1 text-white/85">
                    <MapPin className="size-4" />
                    {business.city}
                  </span>
                )}
                <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 backdrop-blur">
                  <Star className="size-3.5 fill-amber-300 text-amber-300" />
                  <span className="font-semibold">
                    {business.rating_avg > 0 ? business.rating_avg.toFixed(1) : "—"}
                  </span>
                  <span className="text-white/70">
                    ({business.reviews_count})
                  </span>
                </span>
              </div>

              {business.hours.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium backdrop-blur",
                      open
                        ? "bg-success/90 text-success-foreground"
                        : "bg-black/25 text-white",
                    )}
                  >
                    <span className="relative flex size-2">
                      {open && (
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
                      )}
                      <span className="relative inline-flex size-2 rounded-full bg-current" />
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

          {/* Quick actions */}
          <div className="mt-5 border-t border-border/40 pt-4">
            <QuickActions business={business} locale={locale} />
          </div>
        </div>
      </div>
    </section>
  );
}