"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BadgeCheck,
  Heart,
  MapPin,
  MessageCircle,
  Share2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RatingStars } from "@/components/rating-stars";
import { SmartImage } from "@/components/smart-image";
import { DEFAULT_PLACEHOLDER_IMAGES } from "@/lib/constants";
import { localizedName } from "@/lib/translations";
import { cn } from "@/lib/utils";
import type { SearchBusiness } from "@/lib/search/types";

export function ResultCard({
  business,
}: {
  business: SearchBusiness;
}) {
  const locale = useLocale() as "ar" | "fr" | "en";
  const t = useTranslations("businessCard");
  const tS = useTranslations("search");
  const [favorite, setFavorite] = useState(false);

  const categoryName = localizedName(business.categories, locale);
  const pageHref = `/business/${business.slug}`;

  function share() {
    const data = {
      title: business.name,
      text: business.description ?? business.name,
      url: window.location.origin + pageHref,
    };
    if (navigator.share) {
      navigator.share(data).catch(() => undefined);
    } else {
      navigator.clipboard?.writeText(data.url).catch(() => undefined);
    }
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        <Link href={pageHref} aria-label={business.name}>
          <SmartImage
            src={business.cover_url}
            alt={business.name}
            fallback={DEFAULT_PLACEHOLDER_IMAGES.cover}
            imgClassName="transition-transform duration-700 group-hover:scale-105"
          />
        </Link>

        {business.logo_url && (
          <span
            className={cn(
              "absolute start-3 top-3 z-10 size-11 overflow-hidden border-2 border-background bg-card",
            )}
          >
            <SmartImage
              src={business.logo_url}
              alt=""
              fallback={DEFAULT_PLACEHOLDER_IMAGES.logo}
              className="h-full w-full"
              imgClassName="object-cover"
            />
          </span>
        )}

        <div className="absolute inset-x-3 top-3 flex items-start justify-end gap-1.5">
          <IconButton
            label={t("favorite")}
            active={favorite}
            onClick={() => setFavorite((v) => !v)}
            className={favorite ? "text-primary" : ""}
          >
            <Heart className={cn("size-4", favorite && "fill-primary")} />
          </IconButton>
          <IconButton label={t("share")} onClick={share}>
            <Share2 className="size-4" />
          </IconButton>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5">
              <Link
                href={pageHref}
                className="line-clamp-1 text-lg font-semibold tracking-tight group-hover:underline"
              >
                {business.name}
              </Link>
              {business.verified && (
                <span title={t("verified")}>
                  <BadgeCheck className="size-4 shrink-0 fill-primary/15 text-primary" />
                </span>
              )}
            </p>
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
              {categoryName || (business.city ? business.city : "\u00a0")}
            </p>
          </div>
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            {business.distance_km != null
              ? `${business.distance_km.toFixed(1)} km`
              : null}
          </span>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
          <RatingStars rating={business.rating_avg} size="size-3.5" />
          <span className="text-sm font-semibold">
            {business.rating_avg > 0 ? business.rating_avg.toFixed(1) : tS("new")}
          </span>
          {business.city && (
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="line-clamp-1">{business.city}</span>
            </span>
          )}
          {business.open_now !== undefined && (
            <StatusChip open={business.open_now} />
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <div>
            {business.starting_price != null ? (
              <p className="text-sm">
                <span className="font-semibold">{formatMAD(business.starting_price, locale)}</span>
                <span className="text-muted-foreground"> {tS("fromLabel")}</span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{tS("priceOnRequest")}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/${business.whatsapp?.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => !business.whatsapp && e.preventDefault()}
              className={cn(
                "grid size-8 place-items-center transition-colors",
                business.whatsapp
                  ? "text-whatsapp hover:bg-muted"
                  : "pointer-events-none opacity-40",
              )}
              aria-label={business.name + " — WhatsApp"}
            >
              <MessageCircle className="size-4" />
            </a>
            <Link
              href={pageHref}
              aria-label={t("visit")}
              className="inline-flex items-center gap-1 text-sm font-semibold transition-colors hover:text-primary"
            >
              {t("visit")}
              <ArrowUpRight className="size-4 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function StatusChip({ open }: { open: boolean }) {
  const t = useTranslations("business");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold",
        open ? "text-success" : "text-muted-foreground",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {open ? t("openNow") : t("closed")}
    </span>
  );
}

function IconButton({
  children,
  label,
  onClick,
  className,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center bg-background/95 text-foreground backdrop-blur transition-colors hover:bg-foreground hover:text-background",
        active ? "text-primary" : "text-muted-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

function formatMAD(amount: number, locale: "ar" | "fr" | "en"): string {
  const value = new Intl.NumberFormat(locale === "ar" ? "ar-MA" : locale, {
    maximumFractionDigits: 0,
  }).format(amount);
  return locale === "ar" ? `${value} د.م.` : `${value} DH`;
}