"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { buildSearchUrl } from "@/lib/search/url";
import type { SearchParams, SearchResponse, SortKey } from "@/lib/search/types";

export type SearchState = Omit<
  SearchParams,
  "offset" | "limit" | "lat" | "lng"
>;

export type SearchFilterState = Omit<SearchState, "q">;

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function useSearch(initial: Partial<SearchState>) {
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [q, setQ] = useState(initial.q ?? "");
  const [filters, setFilters] = useState<SearchFilterState>({
    city: initial.city ?? "",
    category: initial.category ?? "",
    minRating: initial.minRating ?? 0,
    minPrice: initial.minPrice ?? null,
    maxPrice: initial.maxPrice ?? null,
    verifiedOnly: initial.verifiedOnly ?? false,
    premiumOnly: initial.premiumOnly ?? false,
    openNowOnly: initial.openNowOnly ?? false,
    sort: initial.sort ?? "recommended",
  });

  const debouncedQ = useDebouncedValue(q, 350);
  const [pending, setPending] = useState(false);

  const queryKey = useMemo(
    () =>
      [
        "search",
        locale,
        debouncedQ,
        filters.city,
        filters.category,
        filters.minRating,
        filters.minPrice,
        filters.maxPrice,
        filters.verifiedOnly,
        filters.premiumOnly,
        filters.openNowOnly,
        filters.sort,
      ] as const,
    [locale, debouncedQ, filters],
  );

  const buildQuery = useCallback(
    (offset: number) => {
      const sp = new URLSearchParams();
      if (debouncedQ) sp.set("q", debouncedQ);
      if (filters.city) sp.set("city", filters.city);
      if (filters.category) sp.set("category", filters.category);
      if (filters.minRating > 0) sp.set("minRating", String(filters.minRating));
      if (filters.minPrice != null) sp.set("minPrice", String(filters.minPrice));
      if (filters.maxPrice != null) sp.set("maxPrice", String(filters.maxPrice));
      if (filters.verifiedOnly) sp.set("verifiedOnly", "1");
      if (filters.premiumOnly) sp.set("premiumOnly", "1");
      if (filters.openNowOnly) sp.set("openNow", "1");
      if (filters.sort !== "recommended") sp.set("sort", filters.sort);
      sp.set("offset", String(offset));
      return sp.toString();
    },
    [debouncedQ, filters],
  );

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      setPending(true);
      try {
        const res = await fetch(`/api/search?${buildQuery(pageParam)}`);
        if (!res.ok) throw new Error("search_failed");
        return (await res.json()) as SearchResponse;
      } finally {
        setPending(false);
      }
    },
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.hasMore ? last.offset + last.limit : undefined,
    staleTime: 30_000,
  });

  // Keep the URL in sync with committed filters (SEO + shareable + back).
  // Written via history.replaceState so typing never triggers a server round
  // trip or re-mount of the explorer.
  useEffect(() => {
    const url = `/${locale}${buildSearchUrl({
      q: debouncedQ,
      ...filters,
      lat: null,
      lng: null,
      offset: 0,
      limit: 12,
    })}`;
    if (window.location.pathname + window.location.search !== url) {
      window.history.replaceState(null, "", url);
    }
  }, [debouncedQ, filters, locale]);

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );
  const total = query.data?.pages[0]?.total ?? 0;
  const isError =
    query.isError || Boolean(query.data?.pages[0]?.error);

  const setFilter = useCallback(
    <K extends keyof SearchFilterState>(
      key: K,
      value: SearchFilterState[K],
    ) => {
      setFilters((f) => ({ ...f, [key]: value }));
    },
    [],
  );

  const defaultFilters = (): SearchFilterState => ({
    city: "",
    category: "",
    minRating: 0,
    minPrice: null,
    maxPrice: null,
    verifiedOnly: false,
    premiumOnly: false,
    openNowOnly: false,
    sort: "recommended",
  });

  const resetAll = useCallback(() => {
    setQ("");
    setFilters(defaultFilters());
    queryClient.resetQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    q,
    setQ,
    filters,
    setFilter,
    setSort: (sort: SortKey) => setFilter("sort", sort),
    resetAll,
    items,
    total,
    isLoading: query.isLoading || query.isFetching,
    isPending: pending,
    isError,
    hasMore: query.hasNextPage,
    loadMore: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    activeFilterCount: Object.values(filters).filter((v) =>
      typeof v === "boolean" ? v : Boolean(v),
    ).length,
  };
}