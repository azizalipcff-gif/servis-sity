"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Loader2, Wand2, X } from "lucide-react";
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
    <div className="flex flex-col gap-2">
      <div className="flex h-12 items-center gap-2 rounded-2xl border bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 px-4 shadow-sm transition-all focus-within:ring-4 focus-within:ring-primary/10">
        <Sparkles className="size-5 shrink-0 text-primary" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          aria-label={t("aiSearchPlaceholder")}
          placeholder={t("aiSearchPlaceholder")}
          className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
        />
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground transition-transform hover:scale-105 active:scale-95"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Wand2 className="size-4" />
          )}
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
            className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3 shadow-lg"
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
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
              >
                <X className="size-3.5" />
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={apply}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
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
    <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium">
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