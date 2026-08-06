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
    <div className="h-fit rounded-2xl border bg-card/60 p-4 backdrop-blur lg:sticky lg:top-24">
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