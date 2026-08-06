"use client";

import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { FilterControls } from "@/components/search/filter-controls";
import type { SearchFilterState } from "./use-search";
import type { Category } from "@/lib/supabase/database.types";

export function MobileFilterSheet({
  open,
  onOpenChange,
  filters,
  setFilter,
  categories,
  onReset,
  activeCount,
  onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  filters: SearchFilterState;
  setFilter: <K extends keyof SearchFilterState>(
    key: K,
    value: SearchFilterState[K],
  ) => void;
  categories: Category[];
  onReset: () => void;
  activeCount: number;
  onApply: () => void;
}) {
  const t = useTranslations("search");

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            aria-label={t("close")}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("filters")}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-3xl border bg-background shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border" aria-hidden />
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <SlidersHorizontal className="size-4" />
                {t("filters")}
                {activeCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                    {activeCount}
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label={t("close")}
                className="grid size-9 place-items-center rounded-full hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-4">
              <FilterControls
                filters={filters}
                setFilter={setFilter}
                categories={categories}
                onReset={onReset}
                activeCount={activeCount}
              />
            </div>

            <div className="border-t bg-background p-4">
              <button
                type="button"
                onClick={() => {
                  onApply();
                  onOpenChange(false);
                }}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.99]"
              >
                {t("showResults")}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}