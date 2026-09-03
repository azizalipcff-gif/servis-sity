"use client";

import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { SearchInput } from "@/components/search/search-input";
import { ResultsView } from "@/components/search/results-view";
import { SearchIndex } from "@/components/search/search-index";
import { useSearch } from "@/components/search/use-search";
import type { SearchIndexData } from "@/lib/search/index";
import type { Category } from "@/lib/supabase/database.types";
import type { SearchResultType } from "@/lib/search/types";

type Initial = {
  q?: string;
  type?: SearchResultType;
  city?: string;
  category?: string;
};

export function SearchExplorer({ initial, categories, index }: {
  initial: Initial;
  categories: Category[];
  index: SearchIndexData | null;
}) {
  const t = useTranslations("search");
  const nav = useTranslations("nav");
  const search = useSearch(initial);
  const submit = (e: FormEvent<HTMLFormElement>) => e.preventDefault();

  const hasQuery = search.isLanding
    ? false
    : Boolean(search.q) || search.type !== "all" || Boolean(initial.city) || Boolean(initial.category);

  return (
    <div className="container-site">
      <div className="flex flex-col gap-3 border-b border-border py-5 md:py-6">
        <h1 className="text-2xl font-bold sm:text-3xl">{t("heroTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("heroSubtitle")}</p>
      </div>

      <div className="max-w-3xl py-6">
        <form onSubmit={submit} className="flex items-center gap-2">
          <select
            value={search.type}
            onChange={(e) => search.setType(e.target.value as SearchResultType)}
            className="h-10 shrink-0 rounded-xl border border-border bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30"
            aria-label={t("typeAll")}
          >
            <option value="all">{t("typeAll")}</option>
            <option value="business">{t("typeBusiness")}</option>
            <option value="service">{t("typeService")}</option>
            <option value="product">{t("typeProduct")}</option>
          </select>
          <div className="min-w-0 flex-1">
            <SearchInput
              value={search.q}
              onChange={search.setQ}
              onSubmit={submit}
              placeholder={t("searchPlaceholder")}
              buttonLabel={nav("search")}
            />
          </div>
        </form>
      </div>

      {search.isLanding && index ? (
        <div className="pb-16"><SearchIndex data={index} /></div>
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