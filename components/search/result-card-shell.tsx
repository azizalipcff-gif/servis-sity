"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  Clock,
  Heart,
  MapPin,
  Share2,
  ShoppingBag,
  Store,
  Wrench,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useFavorite } from "@/components/favorites/use-favorite";
import { RatingStars } from "@/components/rating-stars";
import { SmartImage } from "@/components/smart-image";
import { DEFAULT_PLACEHOLDER_IMAGES } from "@/lib/constants";
import { formatPrice } from "@/lib/translations";
import { cn } from "@/lib/utils";
import type { ResultItemData } from "./card-data";

/** Unified marketplace card for business, service, and product results. */
export function ResultCardShell({
  data,
  category,
  index = 0,
  premium = false,
  showPrice = true,
}: {
  data: ResultItemData;
  category?: string | null;
  index?: number;
  premium?: boolean;
  showPrice?: boolean;
}) {
  const locale = useLocale() as "ar" | "fr" | "en";
  const t = useTranslations("businessCard");
  const tS = useTranslations("search");
  const tB = useTranslations("business");
  const tp = useTranslations("product");
  const { saved, toggle, busy } = useFavorite(data.kind, data.id);

  const icon =
    data.kind === "product" ? <ShoppingBag className="size-3" /> :
    data.kind === "service" ? <Wrench className="size-3" /> : <Store className="size-3" />;
  const entityLabel =
    data.kind === "product" ? tS("entityProduct") :
    data.kind === "service" ? tS("entityService") : tS("entityBusiness");
  const subline = data.kind === "business" ? category : data.sellerName || category;

  return (
    <motion.article
      layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.02 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
    >
      <Link href={data.href} aria-label={data.name} className="relative block aspect-[16/10] overflow-hidden bg-muted">
        <SmartImage
          src={data.imageSrc}
          alt={data.name}
          fallback={data.kind === "product" ? DEFAULT_PLACEHOLDER_IMAGES.business : DEFAULT_PLACEHOLDER_IMAGES.cover}
          className="h-full w-full"
          imgClassName="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="absolute start-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-full bg-foreground/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background backdrop-blur">
          {icon}{entityLabel}
        </span>
        {premium && <span className="absolute bottom-2.5 start-2.5 z-10 inline-flex items-center rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-bold leading-none text-accent-foreground shadow-sm">{t("premium")}</span>}
        {data.kind !== "business" && data.discountPct != null && <span className="absolute bottom-2.5 start-2.5 z-10 inline-flex items-center rounded-md bg-gold px-1.5 py-0.5 text-[11px] font-bold leading-none text-black">−{data.discountPct}%</span>}
        {data.kind === "product" && data.outOfStock && <span className="absolute bottom-2.5 end-2.5 z-10 inline-flex items-center rounded-md bg-foreground px-1.5 py-0.5 text-[11px] font-semibold leading-none text-background">{tp("outOfStock")}</span>}
      </Link>

      <div className="absolute end-2.5 top-2.5 z-20 flex flex-col gap-1.5">
        <button type="button" aria-label={t("favorite")} aria-pressed={saved} aria-busy={busy || undefined} onClick={toggle} className={cn("grid size-9 place-items-center rounded-full bg-white/85 text-foreground/70 shadow-sm backdrop-blur-md transition-all duration-200 hover:bg-white", saved ? "text-accent" : "hover:scale-110 hover:text-accent")}> 
          <Heart className={cn("size-4", saved && "fill-accent text-accent")} />
        </button>
        <ShareButton name={data.name} href={data.href} label={t("share")} />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="min-w-0">
          <p className="flex items-start gap-1.5">
            <Link href={data.href} className="line-clamp-2 min-h-10 text-[15px] font-semibold leading-snug tracking-tight group-hover:underline">{data.name}</Link>
            {data.verified === true && <span title={t("verified")} className="shrink-0 pt-0.5"><BadgeCheck className="size-4 fill-primary/15 text-primary" /></span>}
          </p>
          {subline && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{subline}</p>}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
          {data.rating > 0 ? (
            <span className="flex items-center gap-1"><RatingStars rating={data.rating} size="size-3.5" /><span className="text-sm font-semibold tabular-nums">{data.rating.toFixed(1)}</span>{data.reviewsCount > 0 && <span className="text-xs text-muted-foreground">({data.reviewsCount})</span>}</span>
          ) : <span className="text-xs font-medium text-muted-foreground">{tS("new")}</span>}
          {data.durationMinutes ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" />{data.durationMinutes} {tB("minutes")}</span> : null}
          {data.city && <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3 shrink-0" /><span className="line-clamp-1">{data.city}</span></span>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5">
          <div className="min-w-0">{showPrice && (data.priceMode !== "request" && data.priceValue != null ? <p className="flex items-baseline gap-1.5">{data.priceMode === "from" && <span className="text-[11px] text-muted-foreground">{tS("fromLabel")}</span>}<span className="text-sm font-bold tabular-nums tracking-tight">{formatPrice(data.priceValue, locale)}</span>{data.compareAtPrice != null && <s className="text-xs tabular-nums text-muted-foreground">{formatPrice(data.compareAtPrice, locale)}</s>}</p> : <p className="text-xs text-muted-foreground">{tS("priceOnRequest")}</p>)}</div>
          <Link href={data.href} aria-label={t("visit")} className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary/80">{t("visit")}<ArrowUpRight className="size-4 rtl:rotate-180" /></Link>
        </div>
      </div>
    </motion.article>
  );
}

function ShareButton({ name, href, label }: { name: string; href: string; label: string }) {
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = `${window.location.origin}/${locale}${href}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) { await navigator.share({ title: name, url }); return; }
      if (navigator.clipboard) { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
    } catch { /* dismissed/unavailable */ }
  }
  return <button type="button" aria-label={label} title={copied ? "✓" : label} onClick={share} className="grid size-9 place-items-center rounded-full bg-white/85 text-foreground/70 shadow-sm backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-white hover:text-foreground">{copied ? <Check className="size-4 text-success" /> : <Share2 className="size-4" />}</button>;
}
