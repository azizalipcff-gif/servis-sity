"use client";

import { useTranslations } from "next-intl";
import { Heart, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BusinessCard } from "@/components/business-card";
import { ServiceCard } from "@/components/services/service-card";
import { ProductCard } from "@/components/products/product-card";
import { useFavorites } from "@/components/favorites/favorites-provider";
import type { FavoritesData } from "@/lib/favorites";

export function FavoritesList({ initial }: { initial: FavoritesData }) {
  const t = useTranslations("profile");
  const { ready, isFavorite } = useFavorites();

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const businesses = initial.businesses.filter((b) => isFavorite("business", b.id));
  const services = initial.services.filter((s) => isFavorite("service", s.id));
  const products = initial.products.filter((p) => isFavorite("product", p.id));

  const total = businesses.length + services.length + products.length;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed bg-card/40 p-10 text-center">
        <Heart className="size-8 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">{t("emptyFavorites")}</p>
        <Button asChild variant="outline">
          <Link href="/business">{t("favoritesCta")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {businesses.length > 0 && (
        <section aria-label={t("favoritesBusinesses")}>
          <h3 className="mb-4 text-base font-semibold">{t("favoritesBusinesses")}</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {businesses.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        </section>
      )}

      {services.length > 0 && (
        <section aria-label={t("favoritesServices")}>
          <h3 className="mb-4 text-base font-semibold">{t("favoritesServices")}</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {services.map((s) => (
              <ServiceCard
                key={s.id}
                service={s}
                seller={
                  s.business
                    ? {
                        name: s.business.name,
                        slug: s.business.slug ?? undefined,
                        logo_url: s.business.logo_url,
                        verified: s.business.verified,
                        city: s.business.city,
                        rating_avg: s.business.rating_avg,
                        reviews_count: s.business.reviews_count,
                      }
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      )}

      {products.length > 0 && (
        <section aria-label={t("favoritesProducts")}>
          <h3 className="mb-4 text-base font-semibold">{t("favoritesProducts")}</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                seller={
                  p.business
                    ? {
                        name: p.business.name,
                        slug: p.business.slug ?? undefined,
                        logo_url: p.business.logo_url,
                        verified: p.business.verified,
                        city: p.business.city,
                        rating_avg: p.business.rating_avg,
                        reviews_count: p.business.reviews_count,
                      }
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      )}

      {businesses.length === 0 && (
        <EmptyHint label={t("emptyFavoritesBusinesses")} />
      )}
      {services.length === 0 && (
        <EmptyHint label={t("emptyFavoritesServices")} />
      )}
      {products.length === 0 && (
        <EmptyHint label={t("emptyFavoritesProducts")} />
      )}
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed bg-card/40 px-4 py-3 text-sm text-muted-foreground">
      <Heart className="size-4 shrink-0 text-muted-foreground/40" />
      <span>{label}</span>
    </div>
  );
}