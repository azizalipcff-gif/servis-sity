"use client";

import { BadgeCheck, MapPin, MessageCircle, Phone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RatingStars } from "@/components/rating-stars";
import { SmartImage } from "@/components/smart-image";
import { DEFAULT_PLACEHOLDER_IMAGES } from "@/lib/constants";
import { localizedName, type Locale } from "@/lib/translations";
import type { BusinessWithCategory } from "@/lib/queries";

export function BusinessCard({
  business,
}: {
  business: BusinessWithCategory;
}) {
  const locale = useLocale();
  const t = useTranslations("businessCard");

  const categoryName = localizedName(
    business.categories,
    locale as Locale,
  );
  const pageHref = `/business/${business.slug}`;

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg">
      <Link href={pageHref} className="relative block aspect-[16/10] overflow-hidden">
        <SmartImage
          src={business.cover_url}
          alt={business.name}
          fallback={DEFAULT_PLACEHOLDER_IMAGES.cover}
          imgClassName="transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          {business.verified && (
            <Badge
              variant="secondary"
              className="gap-1 bg-white/90 backdrop-blur"
            >
              <BadgeCheck className="size-3.5 text-primary" />
              {t("verified")}
            </Badge>
          )}
          {business.plan !== "free" && (
            <Badge className="bg-accent text-accent-foreground">
              {business.plan === "pro" ? "Pro" : t("premium")}
            </Badge>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={pageHref}
              className="line-clamp-1 font-semibold hover:text-primary"
            >
              {business.name}
            </Link>
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
              {categoryName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <RatingStars rating={business.rating_avg} size="size-3.5" />
          <span className="text-sm font-medium">
            {business.rating_avg > 0 ? business.rating_avg.toFixed(1) : "—"}
          </span>
          <span className="text-xs text-muted-foreground">
            {business.reviews_count > 0
              ? t("reviews", { count: business.reviews_count })
              : t("noReviews")}
          </span>
        </div>

        {business.city && (
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="line-clamp-1">{business.city}</span>
          </p>
        )}

        <div className="mt-auto grid grid-cols-3 gap-2 pt-2">
          <Button asChild variant="outline" size="sm" className="gap-1">
            <a
              href={`tel:${business.phone ?? ""}`}
              onClick={(e) => !business.phone && e.preventDefault()}
            >
              <Phone className="size-3.5" />
              <span className="sr-only sm:not-sr-only">{t("call")}</span>
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1">
            <a
              href={`https://wa.me/${business.whatsapp?.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => !business.whatsapp && e.preventDefault()}
            >
              <MessageCircle className="size-3.5" />
              <span className="sr-only sm:not-sr-only">{t("whatsapp")}</span>
            </a>
          </Button>
          <Button asChild size="sm">
            <Link href={pageHref}>{t("visit")}</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
