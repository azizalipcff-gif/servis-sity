"use client";

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SearchResponse } from "@/lib/search/types";

/**
 * Submit-driven inline search for the homepage.
 *
 * Unlike the /search page hook, this one:
 *  - never touches the URL (the homepage must not navigate),
 *  - fetches exactly once per submitted query (no per-keystroke requests),
 *  - keeps typing purely local until Search is pressed.
 *
 * It consumes the same canonical /api/search endpoint and the same
 * SearchResponse contract, so the results UI is identical everywhere.
 */
export function useHomeSearch() {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["home-search", submitted ?? ""],
    queryFn: async () => {
      const q = submitted ?? "";
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&offset=0`);
      if (!res.ok) throw new Error("search_failed");
      return (await res.json()) as SearchResponse;
    },
    enabled: submitted != null && submitted.trim().length > 0,
    staleTime: 30_000,
    // Same transient-failure resilience as the /search page.
    retry: 2,
  });

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed) setSubmitted(trimmed);
    },
    [input],
  );

  const handleChange = useCallback((value: string) => {
    setInput(value);
    // Clearing the box returns the homepage to its normal discovery state.
    if (!value) setSubmitted(null);
  }, []);

  const clear = useCallback(() => {
    setInput("");
    setSubmitted(null);
  }, []);

  const active = submitted != null && submitted.trim().length > 0;

  return {
    input,
    setInput: handleChange,
    submit,
    clear,
    active,
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isPending || query.isFetching,
    isError: query.isError || Boolean(query.data?.error),
    refetch: query.refetch,
  };
}