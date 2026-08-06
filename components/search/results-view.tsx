"use client";

import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutGrid,
  List,
  Loader2,
  Map as MapIcon,
  RotateCcw,
  SearchX,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ResultCard } from "@/components/search/result-card";
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
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
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
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            <button
              type="button"
              aria-label={t("gridView")}
              onClick={() => setView("grid")}
              className={cn(
                "grid size-7 place-items-center rounded-md transition-colors",
                view === "grid" ? "bg-muted text-foreground" : "text-muted-foreground",
              )}
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label={t("listView")}
              onClick={() => setView("list")}
              className={cn(
                "grid size-7 place-items-center rounded-md transition-colors",
                view === "list" ? "bg-muted text-foreground" : "text-muted-foreground",
              )}
            >
              <List className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* First-load skeleton */}
      {isLoading && items.length === 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3 overflow-hidden rounded-2xl border bg-card p-4">
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
          <div
            className={cn(
              view === "grid"
                ? "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
                : "flex flex-col gap-4",
            )}
          >
            {items.map((b) => (
              <ResultCard key={b.id} business={b} />
            ))}
          </div>
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
      className="flex flex-col items-center gap-3 rounded-3xl border border-dashed bg-card px-6 py-16 text-center"
    >
      <span className="flex size-16 items-center justify-center rounded-2xl bg-muted/60">
        {icon}
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </motion.div>
  );
}