"use client";

import { useTranslations } from "next-intl";
import { BadgeCheck, Gem, Minus, RotateCcw, Sparkles, Star, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOROCCAN_CITIES, TRENDING_CATEGORIES } from "@/lib/constants";
import { SORT_KEYS, type SortKey } from "@/lib/search/types";
import type { Category } from "@/lib/supabase/database.types";
import type { SearchFilterState } from "./use-search";

export function FilterControls({
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
  const t = useTranslations("search");

  const categoryOptions =
    categories.length > 0
      ? categories.map((c) => ({
          id: c.id,
          slug: c.slug,
          name: c.name_en,
          icon: c.icon,
        }))
      : TRENDING_CATEGORIES.map((c) => ({
          id: "c-" + c.slug,
          slug: c.slug,
          name: c.label.en,
          icon: c.icon,
        }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("filters")}</h3>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <RotateCcw className="size-3" />
            {t("resetFilters")}
          </button>
        )}
      </div>

      {/* City */}
      <Field label={t("city")}>
        <select
          value={filters.city}
          onChange={(e) => setFilter("city", e.target.value)}
          className="select-field"
        >
          <option value="">{t("allCities")}</option>
          {MOROCCAN_CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      {/* Category */}
      <Field label={t("categoryLabel")}>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setFilter("category", "")}
            className={cn(
              "chip",
              filters.category === "" && "chip-active",
            )}
          >
            <Store className="size-3.5" />
            {t("allCategories")}
          </button>
          <div className="grid grid-cols-2 gap-1.5">
            {categoryOptions.map((c) => {
              const active = filters.category === c.slug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setFilter("category", active ? "" : c.slug)}
                  className={cn("chip", active && "chip-active")}
                >
                  <Store className="size-3.5" />
                  <span className="line-clamp-1">{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Field>

      {/* Min rating */}
      <Field label={t("minimumRating")}>
        <div className="flex flex-wrap gap-1.5">
          <RatingPill
            label={t("any")}
            active={filters.minRating === 0}
            onClick={() => setFilter("minRating", 0)}
          />
          {[3, 4, 4.5, 5].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setFilter("minRating", r)}
              className={cn("chip", filters.minRating === r && "chip-active")}
            >
              <Star className={cn("size-3.5", filters.minRating >= r ? "fill-warning text-warning" : "")} />
              {r}+
            </button>
          ))}
        </div>
      </Field>

      {/* Trust / status toggles */}
      <div className="space-y-2">
        <ToggleRow
          icon={<BadgeCheck className="size-4 text-primary" />}
          label={t("verifiedOnly")}
          checked={filters.verifiedOnly}
          onChange={(v) => setFilter("verifiedOnly", v)}
        />
        <ToggleRow
          icon={<Gem className="size-4 text-amber-500" />}
          label={t("premiumOnly")}
          checked={filters.premiumOnly}
          onChange={(v) => setFilter("premiumOnly", v)}
        />
        <ToggleRow
          icon={<Sparkles className="size-4 text-success" />}
          label={t("openNow")}
          checked={filters.openNowOnly}
          onChange={(v) => setFilter("openNowOnly", v)}
        />
      </div>

      {/* Price range */}
      <Field label={t("priceRange")}>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={t("minPrice")}
            value={filters.minPrice ?? ""}
            onChange={(e) =>
              setFilter(
                "minPrice",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
            className="input-field"
          />
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={t("maxPrice")}
            value={filters.maxPrice ?? ""}
            onChange={(e) =>
              setFilter(
                "maxPrice",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
            className="input-field"
          />
        </div>
      </Field>

      {/* Sort */}
      <Field label={t("sort")}>
        <select
          value={filters.sort}
          onChange={(e) => setFilter("sort", e.target.value as SortKey)}
          className="select-field"
        >
          {SORT_KEYS.map((k) => (
            <option key={k} value={k}>
              {t(`sort_${k}`)}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-xl border bg-card px-3 py-2.5 text-sm transition-colors hover:bg-muted/50">
      {icon}
      <span className="flex-1 font-medium">{label}</span>
      <span
        className={cn(
          "flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
          checked ? "justify-end bg-primary" : "bg-input",
        )}
      >
        <span className="block size-4 rounded-full bg-white shadow" />
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function RatingPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("chip", active && "chip-active")}
    >
      <Minus className="size-3.5" />
      {label}
    </button>
  );
}