"use client";

import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { SearchInput } from "@/components/search/search-input";
import { ResultsView } from "@/components/search/results-view";
import { SearchIndex } from "@/components/search/search-index";
import { useSearch } from "@/components/search/use-search";
import type { SearchIndexData } from "@/lib/search/index";
import type { Category } from "@/lib/supabase/database.types";

type Initial = {
  q?: string;
  city?: string;
  category?: string;
};

/**
 * The whole search surface: one text input, one results grid, and a simple
 * landing when nothing is typed. No filters, no map, no AI parse — the query
 * either matches on its own or the user sees related categories.
 */
export function SearchExplorer({
  initial,
  categories,
  index,
}: {
  initial: Initial;
  categories: Category[];
  index: SearchIndexData | null;
}) {
  const t = useTranslations("search");
  const nav = useTranslations("nav");
  const search = useSearch(initial);

  // Results are live as you type; the form just ensures Enter works too.
  const submit = (e: FormEvent<HTMLFormElement>) => e.preventDefault();

  const hasQuery = search.isLanding
    ? false
    : Boolean(search.q) || Boolean(initial.city) || Boolean(initial.category);

  return (
    <div className="container-site">
      <div className="flex flex-col gap-3 border-b border-border py-5 md:py-6">
        <h1 className="text-2xl font-bold sm:text-3xl">{t("heroTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("heroSubtitle")}</p>
      </div>

      <div className="max-w-3xl py-6">
        <SearchInput
          value={search.q}
          onChange={search.setQ}
          onSubmit={submit}
          placeholder={t("searchPlaceholder")}
          buttonLabel={nav("search")}
        />
      </div>

      {search.isLanding && index ? (
        <div className="pb-16">
          <SearchIndex data={index} />
        </div>
      ) : (
        <ResultsView
          items={search.items}
          total={search.total}
          isLoading={search.isLoading}
          isError={search.isError}
          hasMore={search.hasMore}
          isFetchingNextPage={search.isFetchingNextPage}
          loadMore={() => search.loadMore()}
          onRetry={() => search.refetch()}
          onReset={search.reset}
          hasQuery={hasQuery}
          categories={categories}
        />
      )}
    </div>
  );
}