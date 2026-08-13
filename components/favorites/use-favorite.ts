"use client";

import { useFavorites, type FavoriteType } from "./favorites-provider";

/**
 * Per-item favorite binding. Takes an item's type + id and exposes the
 * hydrated `saved` state plus an optimistic `toggle`.
 */
export function useFavorite(type: FavoriteType, id: string) {
  const { isFavorite, toggle, busy, ready } = useFavorites();
  return {
    saved: isFavorite(type, id),
    toggle: () => toggle(type, id),
    busy: busy(type, id),
    ready,
  };
}