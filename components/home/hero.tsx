"use client";

import { ArrowUpRight, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { SmartImage } from "@/components/smart-image";
import { localizedName, type Locale } from "@/lib/translations";
import { MOROCCAN_CITIES, DEFAULT_PLACEHOLDER_IMAGES } from "@/lib/constants";
import type { Category } from "@/lib/supabase/database.types";
import type { BusinessWithCategory } from "@/lib/queries";

export function Hero({
  categories,
  businesses,
}: {
  categories: Category[];
  businesses: BusinessWithCategory[];
}) {
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

  const gallery = businesses.slice(0, 3);

  return (
    <section className="border-b border-border bg-background">
      <div className="container-site grid items-center gap-8 py-8 md:py-12 lg:grid-cols-12 lg:gap-10">
        {/* Text + search */}
        <div className="lg:col-span-7">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-primary"
          >
            {t("badge")}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="text-editorial max-w-2xl text-3xl sm:text-4xl md:text-5xl"
          >
            {t("title")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
            className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            {t("subtitle")}
          </motion.p>

          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16, ease: "easeOut" }}
            className="mt-7 max-w-2xl"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="flex h-14 items-center gap-2 rounded-xl border border-border bg-white p-1.5 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
              <Search className="ms-3 size-5 shrink-0 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                placeholder={t("marketSearchPlaceholder")}
                aria-label={t("marketSearchPlaceholder")}
                className="h-full flex-1 border-0 bg-transparent text-base shadow-none focus-visible:ring-0 md:text-lg"
              />
              <div className="hidden h-full items-center border-s border-border ps-2 md:flex">
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-9 border-0 bg-transparent px-1 text-sm font-medium outline-none"
                >
                  <option value="">{t("allCities")}</option>
                  {MOROCCAN_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                aria-label={t("searchButton")}
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:px-6"
              >
                {t("searchButton")}
                <ArrowUpRight className="size-4 rtl:rotate-180" />
              </button>
            </div>

            {focused && suggestions.length > 0 && (
              <ul className="overflow-hidden rounded-b-xl border-x border-b border-border bg-background py-1 shadow-lift">
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
          </motion.form>

          {categories.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
              <span className="text-muted-foreground">{t("popularLabel")}</span>
              {categories.slice(0, 6).map((c, i) => (
                <span key={c.id} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden className="text-border">/</span>}
                  <button
                    type="button"
                    onClick={() => submit(undefined, c.slug)}
                    className="font-medium text-foreground/80 underline-offset-4 transition-colors hover:text-primary hover:underline"
                  >
                    {localizedName(c, locale as Locale)}
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Curated visual */}
        <div className="lg:col-span-5">
          {gallery.length >= 2 ? (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="col-span-2">
                <Link
                  href={`/business/${gallery[0].slug}`}
                  className="group relative block aspect-[16/8] overflow-hidden rounded-2xl"
                >
                  <SmartImage
                    src={gallery[0].cover_url}
                    alt={gallery[0].name}
                    fallback={DEFAULT_PLACEHOLDER_IMAGES.cover}
                    className="h-full w-full"
                    imgClassName="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <GradientLabel name={gallery[0].name} city={gallery[0].city} />
                </Link>
              </div>
              {gallery[1] && (
                <Link
                  href={`/business/${gallery[1].slug}`}
                  className="group relative block aspect-square overflow-hidden rounded-2xl"
                >
                  <SmartImage
                    src={gallery[1].cover_url}
                    alt={gallery[1].name}
                    fallback={DEFAULT_PLACEHOLDER_IMAGES.cover}
                    className="h-full w-full"
                    imgClassName="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <GradientLabel name={gallery[1].name} city={gallery[1].city} compact />
                </Link>
              )}
              {gallery[2] && (
                <Link
                  href={`/business/${gallery[2].slug}`}
                  className="group relative block aspect-square overflow-hidden rounded-2xl"
                >
                  <SmartImage
                    src={gallery[2].cover_url}
                    alt={gallery[2].name}
                    fallback={DEFAULT_PLACEHOLDER_IMAGES.cover}
                    className="h-full w-full"
                    imgClassName="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <GradientLabel name={gallery[2].name} city={gallery[2].city} compact />
                </Link>
              )}
            </div>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center border border-border bg-muted/40 px-8">
              <p className="text-center text-xl font-semibold text-muted-foreground">
                {t("subtitle")}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function GradientLabel({
  name,
  city,
  compact,
}: {
  name: string;
  city: string | null;
  compact?: boolean;
}) {
  return (
    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/10 to-transparent p-3">
      <span className={compact ? "text-xs font-semibold text-white" : "text-sm font-semibold text-white"}>
        {name}
      </span>
      {city && !compact && <span className="text-xs text-white/75">{city}</span>}
    </div>
  );
}