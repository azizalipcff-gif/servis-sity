"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import type { ParsedFilters } from "@/lib/search/types";

type Chip = { key: string; label: string };

export function AiSearchBar({
  onApply,
}: {
  onApply: (filters: ParsedFilters) => void;
}) {
  const t = useTranslations("search");

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ParsedFilters | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/search-parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.filters) {
        setError(t("aiFailed"));
        setFilters(null);
        return;
      }
      setFilters(data.filters as ParsedFilters);
      setOpen(true);
    } catch {
      setError(t("aiFailed"));
      setFilters(null);
    } finally {
      setLoading(false);
    }
  }

  const chips = buildChips(filters);

  function apply() {
    if (!filters) return;
    onApply(filters);
    collapse();
  }

  function collapse() {
    setOpen(false);
    setFilters(null);
    setQuery("");
  }

  return (
    <div className="border border-border bg-background p-5">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="ai-query"
          className="text-sm font-medium text-foreground"
        >
          {t("aiHeading")}
        </label>
        <button
          type="button"
          onClick={collapse}
          aria-label={t("cancel")}
          className="grid size-7 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="mb-4 mt-1 text-xs text-muted-foreground">{t("aiExample")}</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          id="ai-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          aria-label={t("aiSearchPlaceholder")}
          placeholder={t("aiSearchPlaceholder")}
          className="h-11 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {t("aiSearchButton")}
        </button>
      </div>

      <AnimatePresence>
        {error && !filters && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-destructive"
          >
            {error}
          </motion.p>
        )}

        {open && filters && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4"
          >
            <span className="text-xs font-medium text-muted-foreground">
              {t("aiDetected")}
            </span>
            {chips.map((c) => (
              <Chip key={c.key} label={c.label} />
            ))}
            <div className="ms-auto flex items-center gap-2">
              <button
                type="button"
                onClick={collapse}
                className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={apply}
                className="bg-foreground px-4 py-1.5 text-xs font-semibold text-background transition-colors hover:bg-primary"
              >
                {t("applyFilters")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 border-b border-border px-2 py-0.5 text-xs font-medium">
      {label}
    </span>
  );
}

function buildChips(filters: ParsedFilters | null): Chip[] {
  if (!filters) return [];
  const chips: Chip[] = [];
  if (filters.category) chips.push({ key: "cat", label: filters.category });
  if (filters.city) chips.push({ key: "city", label: filters.city });
  if (filters.minRating)
    chips.push({ key: "rating", label: `★ ${filters.minRating}+` });
  if (filters.verifiedOnly) chips.push({ key: "verified", label: "Verified" });
  if (filters.premiumOnly) chips.push({ key: "premium", label: "Premium" });
  if (filters.openNow) chips.push({ key: "open", label: "Open now" });
  return chips;
}