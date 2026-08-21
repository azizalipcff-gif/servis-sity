"use client";

import { useLocale, useTranslations } from "next-intl";
import { Sparkles, Store } from "lucide-react";
import { getCategoryIcon } from "@/components/category-icon";
import { Link } from "@/i18n/navigation";
import type { SearchIndexData } from "@/lib/search/index";
import type { SearchItem } from "@/lib/search/types";
import { localizedName, type Locale } from "@/lib/translations";
import { ResultCardShell } from "@/components/search/result-card-shell";
import { categoryText, fromSearchItem } from "@/components/search/card-data";

/**
 * Search landing — shown on `/search` while the query is empty. Keeps the
 * same unified result cards as the results page so businesses, services and
 * products share one design language. Categories deep-link to their pages.
 */
export function SearchIndex({ data }: { data: SearchIndexData }) {
  const t = useTranslations("search");
  const locale = useLocale() as Locale;

  const hasAny =
    data.popularBusinesses.length > 0 ||
    data.popularServices.length > 0 ||
    data.popularProducts.length > 0 ||
    data.categories.length > 0;

  if (!hasAny) return null;

  const scope =
    data.scope === "city" && data.city
      ? t("indexForCity", { city: data.city })
      : t("indexGlobal");

  return (
    <div className="space-y-12 pb-6">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">
            {t("indexTitle")}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{scope}</p>
        </div>
      </div>

      {data.popularBusinesses.length > 0 && (
        <Section
          title={t("indexBusinesses")}
          items={data.popularBusinesses}
          locale={locale}
        />
      )}

      {data.popularServices.length > 0 && (
        <Section
          title={t("indexServices")}
          items={data.popularServices}
          locale={locale}
        />
      )}

      {data.popularProducts.length > 0 && (
        <Section
          title={t("indexProducts")}
          items={data.popularProducts}
          locale={locale}
        />
      )}

      {data.categories.length > 0 && (
        <section>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Store className="size-4" />
            {t("indexCategories")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.categories.map((c) => {
              const Icon = getCategoryIcon(c.icon);
              return (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Icon className="size-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
                  {localizedName(c, locale)}
                  <span className="text-xs text-muted-foreground">({c.count})</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  locale,
}: {
  title: string;
  items: SearchItem[];
  locale: Locale;
}) {
  return (
    <section>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <ResultCardShell
            key={`${item.kind}-${item.id}`}
            index={index}
            data={fromSearchItem(item)}
            category={categoryText(item.categories, locale)}
          />
        ))}
      </div>
    </section>
  );
}