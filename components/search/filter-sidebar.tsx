"use client";

import { FilterControls } from "@/components/search/filter-controls";
import type { SearchFilterState } from "./use-search";
import type { Category } from "@/lib/supabase/database.types";

export function FilterSidebar({
  filters,
  setFilter,
  categories,
  onReset,
  activeCount,
}: {
  filters: SearchFilterState;
  setFilter: <K extends keyof SearchFilterState>(
    key: K,
    value: SearchFilterState[K],
  ) => void;
  categories: Category[];
  onReset: () => void;
  activeCount: number;
}) {
  return (
    <div className="lg:sticky lg:top-[9.25rem] lg:max-h-[calc(100dvh-9.5rem)] lg:overflow-y-auto lg:border-e lg:border-border lg:pe-8 lg:scrollbar-thin">
      <FilterControls
        filters={filters}
        setFilter={setFilter}
        categories={categories}
        onReset={onReset}
        activeCount={activeCount}
      />
    </div>
  );
}