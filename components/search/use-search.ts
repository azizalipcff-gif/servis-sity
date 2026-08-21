"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import type { SearchResponse } from "@/lib/search/types";

export type SearchQueryState = {
  q: string;
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
  const debouncedQ = useDebouncedValue(q, 350);
  const city = initial.city ?? "";
  const category = initial.category ?? "";
  const [pending, setPending] = useState(false);

  // Empty text + no deep-link scope => show the simple landing instead of
  // fetching anything. The missing request is the whole point.
  const isLanding = debouncedQ === "" && city === "" && category === "";

  const queryKey = ["search", locale, debouncedQ, city, category] as const;

  const buildQuery = useCallback(
    (offset: number) => {
      const sp = new URLSearchParams();
      if (debouncedQ) sp.set("q", debouncedQ);
      if (city) sp.set("city", city);
      if (category) sp.set("category", category);
      sp.set("offset", String(offset));
      return sp.toString();
    },
    [debouncedQ, city, category],
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
    enabled: !isLanding,
    // A first request can fail while the dev server lazily compiles the route
    // graph right after a refactor (Turbopack). The server is fine immediately
    // after, so persist past that single transient failure automatically.
    retry: 2,
  });

  // Keep the URL in sync with the committed query (shareable + back button).
  // Written via history.replaceState so typing never triggers a server round
  // trip or re-mount.
  useEffect(() => {
    const sp = new URLSearchParams();
    if (debouncedQ) sp.set("q", debouncedQ);
    if (city) sp.set("city", city);
    if (category) sp.set("category", category);
    const qstring = sp.toString();
    const url = `/${locale}/search${qstring ? `?${qstring}` : ""}`;
    if (`${window.location.pathname}${window.location.search}` !== url) {
      window.history.replaceState(null, "", url);
    }
  }, [debouncedQ, city, category, locale]);

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );
  const total = query.data?.pages[0]?.total ?? 0;
  const isError = query.isError || Boolean(query.data?.pages[0]?.error);

  const reset = useCallback(() => setQ(""), []);

  return {
    q,
    setQ,
    reset,
    items,
    total,
    isLanding,
    isLoading: query.isLoading || query.isFetching,
    isPending: pending,
    isError,
    hasMore: query.hasNextPage,
    loadMore: query.fetchNextPage,
    refetch: query.refetch,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}