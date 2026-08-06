"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { SlidersHorizontal, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryLabel } from "@/lib/constants";
import { SearchBar } from "@/components/search/search-bar";
import { AiSearchBar } from "@/components/search/ai-search-bar";
import { FilterSidebar } from "@/components/search/filter-sidebar";
import { MobileFilterSheet } from "@/components/search/mobile-filter-sheet";
import { ResultsView } from "@/components/search/results-view";
import {
  useSearch,
  type SearchFilterState,
} from "@/components/search/use-search";
import type { ParsedFilters } from "@/lib/search/types";
import type { Category } from "@/lib/supabase/database.types";

const MapPanel = dynamic(
  () => import("@/components/search/map-panel").then((m) => m.MapPanel),
  { ssr: false, loading: () => null },
);

type Initial = Partial<SearchFilterState> & { q?: string };

export function SearchExplorer({
  initial,
  categories,
}: {
  initial: Initial;
  categories: Category[];
}) {
  const t = useTranslations("search");

  const search = useSearch(initial);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [mapVisible, setMapVisible] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const filter = search.filters;
  const hasAnyQuery = Boolean(search.q) || search.activeFilterCount > 0;

  function applyFilters(parsed: ParsedFilters) {
    if (parsed.q) search.setQ(parsed.q);
    if (parsed.city) search.setFilter("city", parsed.city);
    if (parsed.category) search.setFilter("category", parsed.category);
    if (parsed.minRating) search.setFilter("minRating", parsed.minRating);
    if (parsed.verifiedOnly) search.setFilter("verifiedOnly", true);
    if (parsed.premiumOnly) search.setFilter("premiumOnly", true);
    if (parsed.openNow) search.setFilter("openNowOnly", true);
    setAiOpen(false);
  }

  return (
    <div className="container-site">
      {/* Hero search */}
      <div className="pb-6 pt-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {/* Search inputs */}
      <div className="mx-auto max-w-2xl space-y-2">
        <SearchBar
          q={search.q}
          onQChange={search.setQ}
          onSearch={() => undefined}
          onCategory={(slug) => search.setFilter("category", slug)}
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setAiOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-accent/30 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
          >
            <Sparkles className="size-3.5" />
            {t("aiSearchTitle")}
          </button>
        </div>
        <AnimatePresence>
          {aiOpen && <AiSearchBar onApply={applyFilters} />}
        </AnimatePresence>
      </div>

      {/* Active filter chips */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <FilterChips filters={filter} onRemove={search.setFilter} />
        {hasAnyQuery && (
          <button
            type="button"
            onClick={search.resetAll}
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
          >
            {t("clearAll")}
          </button>
        )}
      </div>

      {/* Layout */}
      <div
        className={cn(
          "mt-6 grid gap-6 pb-16",
          mapVisible
            ? "lg:grid-cols-[280px_minmax(0,1fr)_340px]"
            : "lg:grid-cols-[280px_minmax(0,1fr)]",
        )}
      >
        <aside className="hidden lg:block">
          <FilterSidebar
            filters={filter}
            setFilter={search.setFilter}
            categories={categories}
            onReset={search.resetAll}
            activeCount={search.activeFilterCount}
          />
        </aside>

        <div className="min-w-0">
          <ResultsView
            items={search.items}
            total={search.total}
            view={view}
            setView={setView}
            mapVisible={mapVisible}
            onToggleMap={() => setMapVisible((v) => !v)}
            isLoading={search.isLoading}
            isError={search.isError}
            hasMore={search.hasMore}
            isFetchingNextPage={search.isFetchingNextPage}
            loadMore={() => search.loadMore()}
            onReset={search.resetAll}
            activeCount={search.activeFilterCount}
            hasQuery={hasAnyQuery}
          />
        </div>

        {mapVisible && (
          <MapPanel
            businesses={search.items}
            onClose={() => setMapVisible(false)}
          />
        )}
      </div>

      {/* Mobile filter button */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-5 end-5 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-xl transition-transform hover:scale-105 active:scale-95 lg:hidden"
      >
        <SlidersHorizontal className="size-4" />
        {t("filters")}
        {search.activeFilterCount > 0 && (
          <span className="grid size-5 place-items-center rounded-full bg-white/25 text-xs">
            {search.activeFilterCount}
          </span>
        )}
      </button>

      <MobileFilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        filters={filter}
        setFilter={search.setFilter}
        categories={categories}
        onReset={search.resetAll}
        activeCount={search.activeFilterCount}
        onApply={() => undefined}
      />
    </div>
  );
}

function FilterChips({
  filters,
  onRemove,
}: {
  filters: SearchFilterState;
  onRemove: <K extends keyof SearchFilterState>(
    key: K,
    value: SearchFilterState[K],
  ) => void;
}) {
  const t = useTranslations("search");
  const locale = useLocale();

  const chips: Array<{ key: string; label: string; clear: () => void }> = [];

  if (filters.city)
    chips.push({ key: "city", label: filters.city, clear: () => onRemove("city", "") });
  if (filters.category)
    chips.push({
      key: "category",
      label: categoryLabel(filters.category, locale as "ar" | "fr" | "en") ?? filters.category,
      clear: () => onRemove("category", ""),
    });
  if (filters.minRating > 0)
    chips.push({ key: "rating", label: `★ ${filters.minRating}+`, clear: () => onRemove("minRating", 0) });
  if (filters.verifiedOnly)
    chips.push({ key: "verified", label: t("verifiedOnly"), clear: () => onRemove("verifiedOnly", false) });
  if (filters.premiumOnly)
    chips.push({ key: "premium", label: t("premiumOnly"), clear: () => onRemove("premiumOnly", false) });
  if (filters.openNowOnly)
    chips.push({ key: "open", label: t("openNow"), clear: () => onRemove("openNowOnly", false) });
  if (filters.minPrice != null || filters.maxPrice != null)
    chips.push({
      key: "price",
      label: priceLabel(filters),
      clear: () => {
        onRemove("minPrice", null);
        onRemove("maxPrice", null);
      },
    });

  if (chips.length === 0) return null;

  return (
    <>
      {chips.map((c) => (
        <span
          key={c.key}
          className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-medium"
        >
          {c.label}
          <button
            type="button"
            aria-label={t("removeFilter")}
            onClick={c.clear}
            className="grid size-4 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
    </>
  );
}

function priceLabel(filters: SearchFilterState): string {
  if (filters.minPrice != null && filters.maxPrice != null)
    return `${filters.minPrice}–${filters.maxPrice} DH`;
  if (filters.minPrice != null) return `${filters.minPrice}+ DH`;
  if (filters.maxPrice != null) return `< ${filters.maxPrice} DH`;
  return "DH";
}