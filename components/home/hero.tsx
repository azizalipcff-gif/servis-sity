"use client";

import { Search, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localizedName, type Locale } from "@/lib/translations";
import { MOROCCAN_CITIES } from "@/lib/constants";
import type { Category } from "@/lib/supabase/database.types";

export function Hero({ categories }: { categories: Category[] }) {
  const t = useTranslations("hero");
  const locale = useLocale();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return categories
      .filter((c) =>
        [c.name_ar, c.name_fr, c.name_en].some((name) =>
          name.toLowerCase().includes(q),
        ),
      )
      .slice(0, 6);
  }, [query, categories]);

  function submit(value?: string, slug?: string) {
    if (slug) {
      router.push(`/category/${slug}`);
      return;
    }
    const q = (value ?? query).trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (city) params.set("city", city);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-secondary/60 to-background">
      <div className="container-site flex flex-col items-center py-16 text-center md:py-24">
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          {t("badge")}
        </span>

        <h1 className="mt-5 max-w-2xl text-balance text-3xl font-bold leading-tight md:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-xl text-balance text-muted-foreground md:text-lg">
          {t("subtitle")}
        </p>

        <form
          className="mt-8 w-full max-w-2xl"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex flex-col gap-2 rounded-2xl border bg-card p-2 shadow-sm sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                placeholder={t("searchPlaceholder")}
                className="border-0 ps-9 shadow-none focus-visible:ring-0"
              />
              {focused && suggestions.length > 0 && (
                <ul className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border bg-card shadow-lg">
                  {suggestions.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onMouseDown={() => {
                          setQuery(localizedName(c, locale as Locale));
                          submit(undefined, c.slug);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-start text-sm hover:bg-muted"
                      >
                        <Search className="size-4 text-muted-foreground" />
                        {localizedName(c, locale as Locale)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{t("cityPlaceholder")}</option>
              {MOROCCAN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <Button type="submit" size="lg" className="shrink-0">
              <Search className="size-4" />
              {t("searchButton")}
            </Button>
          </div>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t("popularLabel")}
          </span>
          {categories.slice(0, 6).map((c) => (
            <Button
              key={c.id}
              variant="outline"
              size="sm"
              onClick={() => submit(undefined, c.slug)}
              className="rounded-full"
            >
              {localizedName(c, locale as Locale)}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
