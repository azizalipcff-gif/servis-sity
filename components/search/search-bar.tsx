"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  History,
  Search,
  Store,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryIcon } from "@/components/category-icon";
import { TRENDING_CATEGORIES } from "@/lib/constants";

const RECENT_KEY = "servis:recent-searches";

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
  } catch {
    return [];
  }
}

function writeRecent(term: string) {
  try {
    const next = [term, ...readRecent().filter((t) => t !== term)].slice(0, 6);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

type Item =
  | { kind: "q"; label: string; icon: typeof History }
  | { kind: "category"; slug: string; label: string; icon: typeof Store };

export function SearchBar({
  q,
  onQChange,
  onSearch,
  onCategory,
}: {
  q: string;
  onQChange: (v: string) => void;
  onSearch: () => void;
  onCategory: (slug: string) => void;
}) {
  const t = useTranslations("search");
  const locale = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);

  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(readRecent());
  }, []);

  const trending = useMemo<Item[]>(
    () =>
      TRENDING_CATEGORIES.map((c) => ({
        kind: "category" as const,
        slug: c.slug,
        label: c.label[locale as "ar" | "fr" | "en"],
        icon: Store,
      })),
    [locale],
  );

  const recentItems = useMemo<Item[]>(() => {
    if (recent.length === 0) return [];
    return recent
      .filter((r) => r.toLowerCase().includes(q.toLowerCase()))
      .map((r) => ({ kind: "q" as const, label: r, icon: History }));
  }, [recent, q]);

  const list = useMemo<Item[]>(() => {
    const sections: Array<{ title: string; items: Item[]; icon: typeof TrendingUp }> = [];
    if (recentItems.length > 0)
      sections.push({
        title: t("recent"),
        items: recentItems,
        icon: History,
      });
    sections.push({ title: t("trending"), items: trending, icon: TrendingUp });
    return sections.reduce<Item[]>((acc, s) => acc.concat(s.items), []);
  }, [recentItems, trending, t]);

  const total = list.length;
  const [active, setActive] = useState(-1);
  const open = focused && total > 0;

  function onPick(item: Item) {
    if (item.kind === "category") {
      onCategory(item.slug);
    } else {
      onQChange(item.label);
      writeRecent(item.label);
      onSearch();
    }
    blur();
  }

  function blur() {
    setFocused(false);
    inputRef.current?.blur();
  }

  function submit() {
    const trimmed = q.trim();
    if (trimmed) writeRecent(trimmed);
    onSearch();
    setActive(-1);
    blur();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % Math.max(total, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? total - 1 : a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && active >= 0 && list[active]) onPick(list[active]);
      else submit();
    } else if (e.key === "Escape") {
      blur();
    }
  }

  return (
    <div className="relative">
      <div
        className={cn(
          "group flex h-12 items-center gap-2 overflow-hidden rounded-lg border border-border bg-card transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20",
          focused ? "border-primary" : "hover:border-foreground/30",
        )}
      >
        <Search className="ms-3 size-5 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          onKeyDown={onKeyDown}
          type="search"
          aria-label={t("aiSearchPlaceholder")}
          placeholder={t("searchPlaceholder")}
          className="h-full flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/50 [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          type="button"
          onClick={submit}
          aria-label={t("searchButton")}
          className="inline-flex h-full w-12 shrink-0 items-center justify-center bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <ArrowRight className="size-5 rtl:rotate-180" />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute inset-x-0 top-full z-50 mt-2 border border-border bg-background shadow-lift"
            role="listbox"
          >
            <ul className="max-h-80 overflow-y-auto py-1">
              {list.map((item, i) => {
                const Icon = item.icon;
                return (
                  <li key={`${item.kind}-${item.label}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      onMouseEnter={() => setActive(i)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onPick(item);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors",
                        i === active ? "bg-muted" : "text-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="line-clamp-1">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-border px-4 py-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("trending")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TRENDING_CATEGORIES.map((c) => {
                  const Icon = getCategoryIcon(c.icon);
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onCategory(c.slug);
                      }}
                      className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                    >
                      <Icon className="size-3.5" />
                      {c.label[locale as "ar" | "fr" | "en"]}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}