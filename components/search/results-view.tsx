"use client";

import { Loader2, RotateCcw, SearchX, WifiOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ResultCardShell } from "@/components/search/result-card-shell";
import {
  categoryText,
  fromSearchItem,
} from "@/components/search/card-data";
import { getCategoryIcon } from "@/components/category-icon";
import { localizedName, type Locale } from "@/lib/translations";
import type { SearchItem } from "@/lib/search/types";
import type { Category } from "@/lib/supabase/database.types";

export function ResultsView({
  items,
  total,
  isLoading,
  isError,
  hasMore,
  isFetchingNextPage,
  loadMore,
  onRetry,
  onReset,
  hasQuery,
  categories,
}: {
  items: SearchItem[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  hasMore: boolean;
  isFetchingNextPage: boolean;
  loadMore: () => void;
  onRetry: () => void;
  onReset: () => void;
  hasQuery: boolean;
  categories: Category[];
}) {
  const t = useTranslations("search");
  const locale = useLocale() as Locale;

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4">
        <p className="text-sm font-medium text-muted-foreground">
          {t("results", { count: total })}
        </p>
      </div>

      {/* First-load skeleton */}
      {isLoading && items.length === 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <Skeleton className="aspect-[16/10] w-full" />
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
            <Button variant="outline" size="sm" onClick={onRetry}>
              {t("retry")}
            </Button>
          }
        />
      )}

      {/* Empty state */}
      {!isLoading && !isError && items.length === 0 && (
        <>
          <StateCard
            icon={<SearchX className="size-8 text-muted-foreground" />}
            title={t("noResults")}
            description={hasQuery ? t("noResultsHint") : t("emptyHint")}
            action={
              hasQuery ? (
                <Button variant="outline" size="sm" onClick={onReset}>
                  <RotateCcw className="size-3.5" />
                  {t("resetFilters")}
                </Button>
              ) : undefined
            }
          />

          {/* Related categories — rescue the dead-end empty state */}
          {hasQuery && categories.length > 0 && (
            <div className="mt-6 rounded-2xl border border-border bg-card px-5 py-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("relatedCategories")}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("relatedHint")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {categories.map((c) => {
                  const Icon = getCategoryIcon(c.icon);
                  return (
                    <Link
                      key={c.id}
                      href={`/category/${c.slug}`}
                      className="group inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      <Icon className="size-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
                      {localizedName(c, locale)}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Results */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <ResultCardShell
              key={`${item.kind}-${item.id}`}
              index={index}
              data={fromSearchItem(item)}
              category={categoryText(item.categories, locale)}
            />
          ))}
        </div>
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
    <div className="relative flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-sm">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-secondary/70 text-primary ring-1 ring-border">
        {icon}
      </span>
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}