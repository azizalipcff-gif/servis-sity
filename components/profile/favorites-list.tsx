"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Heart, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

type Favorite = {
  id: string;
  created_at: string;
  business?: {
    id: string;
    name: string | null;
    logo_url: string | null;
    slug: string | null;
  } | null;
};

export function FavoritesList() {
  const t = useTranslations("profile");
  const [items, setItems] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/favorites", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setItems(data.favorites ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    setBusy(id);
    const res = await fetch("/api/favorites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setBusy(null);
    if (res.ok) setItems((list) => list.filter((f) => f.id !== id));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-card/40 p-10 text-center">
        <Heart className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">{t("emptyFavorites")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-2">
      <p className="text-sm text-muted-foreground">{t("favoritesIntro")}</p>
      <ul className="space-y-2">
        {items.map((f) => (
          <li
            key={f.id}
            className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
              {f.business?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.business.logo_url}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Heart className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {f.business?.name || "—"}
              </p>
            </div>
            {f.business?.slug && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/business/${f.business.slug}`}>
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={busy === f.id}
              onClick={() => remove(f.id)}
            >
              <Heart className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}