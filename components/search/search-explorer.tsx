"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryLabel } from "@/lib/constants";
import { SearchBar } from "@/components/search/search-bar";
import { FilterSidebar } from "@/components/search/filter-sidebar";
import { MobileFilterSheet } from "@/components/search/mobile-filter-sheet";
import { ResultsView } from "@/components/search/results-view";
import { SearchIndex } from "@/components/search/search-index";
import {
  useSearch,
  type SearchFilterState,
} from "@/components/search/use-search";
import type { ParsedFilters } from "@/lib/search/types";
import type { SearchIndexData } from "@/lib/search/index";
import type { Category } from "@/lib/supabase/database.types";

const MapPanel = dynamic(
  () => import("@/components/search/map-panel").then((m) => m.MapPanel),
  { ssr: false, loading: () => null },
);

type Initial = Partial<SearchFilterState> & { q?: string };

export function SearchExplorer({
  initial,
  categories,
  index,
}: {
  initial: Initial;
  categories: Category[];
  index: SearchIndexData | null;
}) {
  const t = useTranslations("search");

  const search = useSearch(initial, { landingEnabled: index != null });
  const [view, setView] = useState<"grid" | "list">("grid");
  const [mapVisible, setMapVisible] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const filter = search.filters;
  const hasAnyQuery = Boolean(search.q) || search.activeFilterCount > 0;

  /**
   * Landing mode: only a truly empty search (no query, no city, no filters)
   * shows the SearchIndex. Any filter — including a city — activates the
   * normal results mode.
   */
  const hasActiveFilters =
    filter.type !== "all" ||
    Boolean(filter.city) ||
    Boolean(filter.category) ||
    filter.minRating > 0 ||
    filter.minPrice != null ||
    filter.maxPrice != null ||
    filter.verifiedOnly ||
    filter.premiumOnly ||
    filter.openNowOnly ||
    filter.sort !== "recommended";
  const showIndex = index != null && !search.q && !hasActiveFilters;

  const mapBusinesses = useMemo(
    () => search.items.filter((i) => i.kind === "business"),
    [search.items],
  );

  async function runSmartSearch(raw: string) {
    const text = raw.trim();
    if (!text || aiLoading) return;
    // Always run the plain-text search; the AI parse enriches it when possible.
    search.setQ(text);
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/search-parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.filters) {
        setAiError(t("aiFailed"));
        return;
      }
      applyFilters(data.filters as ParsedFilters);
    } catch {
      setAiError(t("aiFailed"));
    } finally {
      setAiLoading(false);
    }
  }

  function applyFilters(parsed: ParsedFilters) {
    if (parsed.city) search.setFilter("city", parsed.city);
    if (parsed.category) search.setFilter("category", parsed.category);
    if (parsed.minRating) search.setFilter("minRating", parsed.minRating);
    if (parsed.minPrice != null) search.setFilter("minPrice", parsed.minPrice);
    if (parsed.maxPrice != null) search.setFilter("maxPrice", parsed.maxPrice);
    if (parsed.verifiedOnly) search.setFilter("verifiedOnly", true);
    if (parsed.premiumOnly) search.setFilter("premiumOnly", true);
    if (parsed.openNow) search.setFilter("openNowOnly", true);
  }

  return (
    <div className="container-site">
      {/* Marketplace discovery header */}
      <div className="flex flex-col gap-3 border-b border-border py-5 md:flex-row md:items-center md:justify-between md:py-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t("heroTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("heroSubtitle")}</p>
        </div>
      </div>

      {/* Single search input — plain text + AI-assisted filters */}
      <div className="max-w-3xl py-6">
        <SearchBar
          q={search.q}
          onQChange={search.setQ}
          onSearch={runSmartSearch}
          onCategory={(slug) => search.setFilter("category", slug)}
          onCity={(city) => search.setFilter("city", city)}
          categories={categories}
          submitting={aiLoading}
        />
        {aiError && (
          <p className="mt-2 text-sm text-destructive">{aiError}</p>
        )}
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground/80">{t("aiHeading")}</span>
          <span>{t("aiExample")}</span>
        </p>
      </div>

      {/* Active filter chips */}
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border pb-5">
        <FilterChips filters={filter} onRemove={search.setFilter} />
        {hasAnyQuery && (
          <button
            type="button"
            onClick={search.resetAll}
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            {t("clearAll")}
          </button>
        )}
      </div>

      {showIndex && index ? (
        <div className="pb-16">
          <SearchIndex
            data={index}
            onCategory={(slug) => search.setFilter("category", slug)}
          />
        </div>
      ) : (
        <>
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
                type={filter.type}
                setType={(type) => search.setFilter("type", type)}
                categories={categories}
                onCategory={(slug) => search.setFilter("category", slug)}
              />
            </div>

            {mapVisible && (
              <MapPanel
                businesses={mapBusinesses}
                onClose={() => setMapVisible(false)}
              />
            )}
          </div>

          {/* Mobile filter button */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="fixed bottom-24 end-5 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lift transition-transform hover:scale-105 active:scale-95 lg:hidden"
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
        </>
      )}
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
      label: priceLabel(filters, locale),
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
          className="inline-flex items-center gap-1.5 text-sm"
        >
          {c.label}
          <button
            type="button"
            aria-label={t("removeFilter")}
            onClick={c.clear}
            className="grid size-4 place-items-center rounded-full text-muted-foreground/70 hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
    </>
  );
}

function priceLabel(filters: SearchFilterState, locale: string): string {
  const suffix = locale === "ar" ? "د.م." : "DH";
  if (filters.minPrice != null && filters.maxPrice != null)
    return `${filters.minPrice}–${filters.maxPrice} ${suffix}`;
  if (filters.minPrice != null) return `${filters.minPrice}+ ${suffix}`;
  if (filters.maxPrice != null) return `< ${filters.maxPrice} ${suffix}`;
  return suffix;
}