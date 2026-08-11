"use client";

import { useTranslations, useLocale } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  BadgeCheck,
  LayoutGrid,
  List,
  Loader2,
  Map as MapIcon,
  MapPin,
  RotateCcw,
  SearchX,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ResultCard } from "@/components/search/result-card";
import { RatingStars } from "@/components/rating-stars";
import { SmartImage } from "@/components/smart-image";
import { DEFAULT_PLACEHOLDER_IMAGES } from "@/lib/constants";
import { localizedName } from "@/lib/translations";
import type { SearchBusiness } from "@/lib/search/types";

export function ResultsView({
  items,
  total,
  view,
  setView,
  mapVisible,
  onToggleMap,
  isLoading,
  isError,
  hasMore,
  isFetchingNextPage,
  loadMore,
  onReset,
  activeCount,
  hasQuery,
}: {
  items: SearchBusiness[];
  total: number;
  view: "grid" | "list";
  setView: (v: "grid" | "list") => void;
  mapVisible: boolean;
  onToggleMap: () => void;
  isLoading: boolean;
  isError: boolean;
  hasMore: boolean;
  isFetchingNextPage: boolean;
  loadMore: () => void;
  onReset: () => void;
  activeCount: number;
  hasQuery: boolean;
}) {
  const t = useTranslations("search");

  return (
    <div className="min-w-0 flex-1">
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">
          {t("results", { count: total })}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleMap}
            className={cn(
              "hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors lg:flex",
              mapVisible
                ? "border-primary/40 bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <MapIcon className="size-3.5" />
            {mapVisible ? t("hideMap") : t("showMap")}
          </button>
          <div className="flex items-center gap-0.5 rounded-lg border p-0.5">
            <button
              type="button"
              aria-label={t("gridView")}
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
              className={cn(
                "grid size-8 place-items-center rounded-md transition-colors",
                view === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              aria-label={t("listView")}
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={cn(
                "grid size-8 place-items-center rounded-md transition-colors",
                view === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* First-load skeleton */}
      {isLoading && items.length === 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <Skeleton className="aspect-[16/9] w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && isError && items.length === 0 && (
        <StateCard
          icon={<WifiOff className="size-8 text-muted-foreground" />}
          title={t("errorTitle")}
          description={t("errorHint")}
          action={
            <Button variant="outline" size="sm" onClick={onReset}>
              {t("retry")}
            </Button>
          }
        />
      )}

      {/* Empty state */}
      {!isLoading && !isError && items.length === 0 && (
        <StateCard
          icon={<SearchX className="size-8 text-muted-foreground" />}
          title={t("noResults")}
          description={
            hasQuery
              ? t("noResultsHint")
              : t("emptyHint")
          }
          action={
            activeCount > 0 || hasQuery ? (
              <Button variant="outline" size="sm" onClick={onReset}>
                <RotateCcw className="size-3.5" />
                {t("resetFilters")}
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Results */}
      {items.length > 0 && (
        <AnimatePresence mode="popLayout">
          {view === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((b) => (
                <ResultCard key={b.id} business={b} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((b) => (
                <ListRow key={b.id} business={b} />
              ))}
            </div>
          )}
        </AnimatePresence>
      )}

      {/* Pending next page */}
      {isFetchingNextPage && (
        <div className="mt-6 flex justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {hasMore && !isFetchingNextPage && (
        <div className="mt-8 flex justify-center">
          <Button variant="outline" size="lg" onClick={() => loadMore()}>
            {t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}

function StateCard({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-sm"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_60%)]"
      />
      <span className="relative flex size-16 items-center justify-center rounded-2xl bg-secondary/70 text-primary ring-1 ring-border">
        {icon}
      </span>
      <div className="relative space-y-1.5">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action && <div className="relative mt-1">{action}</div>}
    </motion.div>
  );
}

function ListRow({ business }: { business: SearchBusiness }) {
  const t = useTranslations("businessCard");
  const tS = useTranslations("search");
  const locale = useLocale() as "ar" | "fr" | "en";
  const categoryName = localizedName(business.categories, locale);
  const pageHref = `/business/${business.slug}`;

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="group flex overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft sm:p-4"
    >
      <Link
        href={pageHref}
        className="relative hidden w-40 shrink-0 overflow-hidden bg-muted sm:block sm:w-52"
        aria-label={business.name}
      >
        <SmartImage
          src={business.cover_url}
          alt={business.name}
          fallback={DEFAULT_PLACEHOLDER_IMAGES.cover}
          className="h-full min-h-28 w-full"
          imgClassName="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-row items-center justify-between gap-6 px-0 py-1 sm:px-5">
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
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
            {categoryName || business.city}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <RatingStars rating={business.rating_avg} size="size-3.5" />
            <span className="text-sm font-semibold">
              {business.rating_avg > 0 ? business.rating_avg.toFixed(1) : "—"}
            </span>
            {business.city && (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3 shrink-0" />
                {business.city}
              </span>
            )}
            {business.starting_price != null && (
              <span className="text-sm text-muted-foreground">
                {formatMAD(business.starting_price, locale)} {tS("fromLabel")}
              </span>
            )}
          </div>
        </div>

        <Link
          href={pageHref}
          aria-label={t("visit")}
          className="grid size-10 shrink-0 place-items-center text-muted-foreground transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
        >
          <ArrowUpRight className="size-5 rtl:rotate-180" />
        </Link>
      </div>
    </motion.article>
  );
}

function formatMAD(amount: number, locale: "ar" | "fr" | "en"): string {
  const value = new Intl.NumberFormat(locale === "ar" ? "ar-MA" : locale, {
    maximumFractionDigits: 0,
  }).format(amount);
  return locale === "ar" ? `${value} د.م.` : `${value} DH`;
}