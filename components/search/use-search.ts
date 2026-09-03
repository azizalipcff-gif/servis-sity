"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import type { SearchResponse, SearchResultType } from "@/lib/search/types";

export type SearchQueryState = {
  q: string;
  type: SearchResultType;
  city: string;
  category: string;
};

function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function useSearch(initial: Partial<SearchQueryState>) {
  const locale = useLocale();
  const [q, setQ] = useState(initial.q ?? "");
  const [type, setType] = useState<SearchResultType>(initial.type ?? "all");
  const debouncedQ = useDebouncedValue(q, 350);
  const city = initial.city ?? "";
  const category = initial.category ?? "";
  const [pending, setPending] = useState(false);
  const isLanding = debouncedQ === "" && city === "" && category === "" && type === "all";
  const queryKey = ["search", locale, debouncedQ, type, city, category] as const;

  const buildQuery = useCallback((offset: number) => {
    const sp = new URLSearchParams();
    if (debouncedQ) sp.set("q", debouncedQ);
    if (type !== "all") sp.set("type", type);
    if (city) sp.set("city", city);
    if (category) sp.set("category", category);
    sp.set("offset", String(offset));
    return sp.toString();
  }, [debouncedQ, type, city, category]);

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
    getNextPageParam: (last) => last.hasMore ? last.offset + last.limit : undefined,
    staleTime: 30_000,
    enabled: !isLanding,
    retry: 2,
  });

  useEffect(() => {
    const sp = new URLSearchParams();
    if (debouncedQ) sp.set("q", debouncedQ);
    if (type !== "all") sp.set("type", type);
    if (city) sp.set("city", city);
    if (category) sp.set("category", category);
    const qstring = sp.toString();
    const url = `/${locale}/search${qstring ? `?${qstring}` : ""}`;
    if (`${window.location.pathname}${window.location.search}` !== url) window.history.replaceState(null, "", url);
  }, [debouncedQ, type, city, category, locale]);

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const total = query.data?.pages[0]?.total ?? 0;
  const isError = query.isError || Boolean(query.data?.pages[0]?.error);
  const reset = useCallback(() => setQ(""), []);

  return {
    q, setQ, type, setType, reset, items, total, isLanding,
    isLoading: query.isLoading || query.isFetching,
    isPending: pending, isError, hasMore: query.hasNextPage,
    loadMore: query.fetchNextPage, refetch: query.refetch,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}