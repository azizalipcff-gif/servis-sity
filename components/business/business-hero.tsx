"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, BadgeCheck, Home, MapPin, Sparkles, Star, Store } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SmartImage } from "@/components/smart-image";
import { DEFAULT_PLACEHOLDER_IMAGES } from "@/lib/constants";
import { localizedName, type Locale } from "@/lib/translations";
import type { BusinessDetail } from "@/lib/queries";
import { trackBusinessView } from "@/lib/analytics/client";
import { QuickActions } from "./quick-actions";

export function BusinessHero({ business }: { business: BusinessDetail }) {
  const t = useTranslations("business");
  const bCard = useTranslations("businessCard");
  const locale = useLocale() as Locale;

  useEffect(() => {
    trackBusinessView(business.id);
  }, [business.id]);

  const browseHref = business.categories
    ? `/business?category=${business.categories.slug}`
    : "/business";

  return (
    <>
      {/* Cinematic hero — the very first visual element below the navbar */}
      <section className="relative h-[300px] overflow-hidden bg-muted sm:h-[400px] lg:h-[460px]">
        <div className="absolute inset-0">
          <SmartImage
            src={business.cover_url}
            alt={business.name}
            fallback={DEFAULT_PLACEHOLDER_IMAGES.cover}
            sizes="100vw"
            className="h-full w-full"
            priority
          />
        </div>

        {/* Bottom 60% contrast gradient */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        {/* Top floating actions — back, entity-type chip, View all */}
        <div className="absolute inset-x-4 top-4 z-20 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              aria-label={t("home")}
              className="grid size-10 place-items-center rounded-full bg-white/80 text-foreground/70 shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white hover:text-foreground"
            >
              <Home className="size-5" />
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/80 shadow-lg backdrop-blur-md">
              <Store className="size-3.5 text-primary" />
              {bCard("entityTypeBusiness")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={browseHref}
              aria-label={t("viewAll")}
              className="inline-flex hidden items-center gap-1 rounded-full bg-white/80 px-3 py-2 text-xs font-semibold text-foreground/70 shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white hover:text-foreground sm:inline-flex"
            >
              {t("viewAll")}
              <ArrowUpRight className="size-3.5 rtl:rotate-180" />
            </Link>
          </div>
        </div>

        {/* Identity anchored bottom-start */}
        <div className="absolute inset-x-0 bottom-0 z-10">
          <div className="container-site">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:gap-5 md:pb-8"
            >
              <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border-2 border-white bg-card shadow-lg md:size-24">
                <SmartImage
                  src={business.logo_url}
                  alt={`${business.name} logo`}
                  fallback={DEFAULT_PLACEHOLDER_IMAGES.logo}
                  className="size-full"
                  imgClassName="object-cover"
                />
              </div>

              <div className="min-w-0 flex-1 pb-1 text-white">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h1 className="min-w-0 break-words text-2xl font-bold leading-tight text-white md:text-4xl">
                    {business.name}
                  </h1>

                  {business.verified && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white ring-1 ring-white/40 backdrop-blur">
                      <BadgeCheck className="size-3.5" />
                      {t("verified")}
                    </span>
                  )}

                  {(business.plan === "premium" || business.plan === "pro") && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-gold px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-black shadow-sm">
                      <Sparkles className="size-3.5" />
                      {business.plan === "premium"
                        ? bCard("premium")
                        : "Pro"}
                    </span>
                  )}
                </div>

                {/* Sub-bar: Category • City • Rating */}
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-white/90">
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
                    <Star className="size-4 fill-gold text-gold" />
                    <span className="font-semibold text-white">
                      {business.rating_avg > 0
                        ? business.rating_avg.toFixed(1)
                        : "—"}
                    </span>
                    <span className="text-white/80">
                      {business.reviews_count > 0
                        ? `(${business.reviews_count})`
                        : t("noReviews")}
                    </span>
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Action bar — directly below the hero */}
      <div className="border-b border-border bg-background">
        <div className="container-site py-3">
          <QuickActions business={business} locale={locale} />
        </div>
      </div>
    </>
  );
}