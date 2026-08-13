"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export type FavoriteType = "business" | "service" | "product";

type FavoriteId = `${FavoriteType}:${string}`;

type FavoriteRow = {
  item_type?: string | null;
  business?: { id: string } | null;
  service?: { id: string } | null;
  product?: { id: string } | null;
};

type FavoritesContextValue = {
  /** True once the initial favorite list has been hydrated (or skipped for guests). */
  ready: boolean;
  isFavorite: (type: FavoriteType, id: string) => boolean;
  /** Optimistic server-backed toggle; no-ops while the target is in flight. */
  toggle: (type: FavoriteType, id: string) => void;
  /** True while a mutation for (type, id) is in flight — guards double-clicks. */
  busy: (type: FavoriteType, id: string) => boolean;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function keyOf(type: FavoriteType, id: string): FavoriteId {
  return `${type}:${id}`;
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();

  const [favorites, setFavorites] = useState<Set<FavoriteId>>(new Set());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busySet, setBusySet] = useState<Set<FavoriteId>>(new Set());

  const authenticatedRef = useRef(false);
  const readyRef = useRef(false);
  const busyRef = useRef<Set<FavoriteId>>(new Set());
  const favoritesRef = useRef<Set<FavoriteId>>(new Set());

  // Hydrate the authenticated user's favorites once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        authenticatedRef.current = Boolean(data.user);

        if (!data.user) {
          setReady(true);
          return;
        }

        const res = await fetch("/api/favorites", { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          setReady(true);
          return;
        }
        const json = (await res.json()) as { favorites?: FavoriteRow[] };
        const next = new Set<FavoriteId>();
        for (const row of json.favorites ?? []) {
          const targetId = row.business?.id ?? row.service?.id ?? row.product?.id;
          if (row.item_type && targetId) {
            next.add(keyOf(row.item_type as FavoriteType, targetId));
          }
        }
        favoritesRef.current = next;
        setFavorites(next);
      } catch {
        /* offline or missing env — fall back to empty interaction state */
      } finally {
        if (!cancelled) {
          readyRef.current = true;
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isFavorite = useCallback(
    (type: FavoriteType, id: string) => favorites.has(keyOf(type, id)),
    [favorites],
  );

  const busy = useCallback(
    (type: FavoriteType, id: string) => busySet.has(keyOf(type, id)),
    [busySet],
  );

  const toggle = useCallback(
    (type: FavoriteType, id: string) => {
      const key = keyOf(type, id);
      if (!readyRef.current) return;
      if (busyRef.current.has(key)) return;

      if (!authenticatedRef.current) {
        const returnTo = pathname && pathname.startsWith("/") ? pathname : "/";
        router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }

      const wasFavorite = favoritesRef.current.has(key);
      const next = new Set(favoritesRef.current);
      if (wasFavorite) {
        next.delete(key);
      } else {
        next.add(key);
      }
      favoritesRef.current = next;
      setFavorites(next);
      setError(null);

      busyRef.current.add(key);
      setBusySet(new Set(busyRef.current));

      fetch("/api/favorites", {
        method: wasFavorite ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("favorite_mutation_failed");
        })
        .catch(() => {
          const rolledBack = new Set(favoritesRef.current);
          if (wasFavorite) {
            rolledBack.add(key);
          } else {
            rolledBack.delete(key);
          }
          favoritesRef.current = rolledBack;
          setFavorites(rolledBack);
          setError(t("error"));
        })
        .finally(() => {
          busyRef.current.delete(key);
          setBusySet(new Set(busyRef.current));
        });
    },
    [router, pathname, t],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({ ready, isFavorite, toggle, busy }),
    [ready, isFavorite, toggle, busy],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
      <div aria-live="assertive" className="sr-only">
        {error}
      </div>
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within <FavoritesProvider>");
  }
  return ctx;
}