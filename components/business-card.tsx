"use client";

import { useState } from "react";
import { ArrowUpRight, BadgeCheck, Heart, MapPin, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SmartImage } from "@/components/smart-image";
import { DEFAULT_PLACEHOLDER_IMAGES } from "@/lib/constants";
import { localizedName, type Locale } from "@/lib/translations";
import { cn } from "@/lib/utils";
import type { BusinessWithCategory } from "@/lib/queries";

export function BusinessCard({
  business,
}: {
  business: BusinessWithCategory;
}) {
  const locale = useLocale();
  const t = useTranslations("businessCard");
  const [favorite, setFavorite] = useState(false);

  const categoryName = localizedName(business.categories, locale as Locale);
  const pageHref = `/business/${business.slug}`;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft">
      <Link
        href={pageHref}
        className="relative block aspect-[16/10] overflow-hidden bg-muted"
      >
        <SmartImage
          src={business.cover_url}
          alt={business.name}
          fallback={DEFAULT_PLACEHOLDER_IMAGES.cover}
          imgClassName="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            {business.verified && (
              <span className="inline-flex items-center gap-1 rounded-sm bg-background/95 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                <BadgeCheck className="size-3 text-success" />
                {t("verified")}
              </span>
            )}
            {business.plan === "premium" && (
              <span className="rounded-sm bg-foreground px-1.5 py-0.5 text-[11px] font-semibold text-background">
                {t("premium")}
              </span>
            )}
          </div>
          <button
            type="button"
            aria-label={t("favorite")}
            aria-pressed={favorite}
            onClick={() => setFavorite((v) => !v)}
            className={cn(
              "grid size-8 place-items-center rounded-full bg-background/95 text-muted-foreground backdrop-blur transition-all duration-200",
              favorite
                ? "text-accent"
                : "hover:scale-110 hover:text-accent",
            )}
          >
            <Heart className={cn("size-4", favorite && "fill-accent")} />
          </button>
        </div>

        {business.logo_url && (
          <span className="absolute bottom-2 start-2.5 z-10 size-9 overflow-hidden border border-border bg-card">
            <SmartImage
              src={business.logo_url}
              alt=""
              fallback={DEFAULT_PLACEHOLDER_IMAGES.logo}
              className="h-full w-full"
              imgClassName="object-cover"
            />
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <Link
          href={pageHref}
          className="line-clamp-1 text-[15px] font-semibold group-hover:underline"
        >
          {business.name}
        </Link>

        <p className="line-clamp-1 text-[13px] text-muted-foreground">
          {categoryName || "—"}
          {business.city && (
            <>
              <span aria-hidden className="px-1 text-border">·</span>
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="size-3 text-muted-foreground/70" />
                {business.city}
              </span>
            </>
          )}
        </p>

        <div className="mt-auto flex items-center gap-2 border-t border-border pt-2">
          <span className="inline-flex items-center gap-1 rounded-sm bg-success/10 px-1.5 py-0.5 text-xs font-bold text-success">
            <Star className="size-3 fill-current" />
            {business.rating_avg > 0 ? business.rating_avg.toFixed(1) : "—"}
          </span>
          <span className="text-xs text-muted-foreground">
            {business.reviews_count > 0
              ? t("reviews", { count: business.reviews_count })
              : t("noReviews")}
          </span>
          <span
            aria-hidden
            className="ms-auto inline-grid size-7 place-items-center rounded-sm border border-border text-muted-foreground transition-all duration-200 group-hover:border-primary group-hover:text-primary"
          >
            <ArrowUpRight className="size-4 rtl:rotate-180" />
          </span>
        </div>
      </div>
    </article>
  );
}