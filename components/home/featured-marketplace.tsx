import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ServiceCard } from "@/components/services/service-card";
import { ProductCard } from "@/components/products/product-card";
import type { ProductWithBusiness, ServiceWithBusiness } from "@/lib/queries";

function sellerFrom(business: {
  name: string | null;
  slug: string | null;
  logo_url: string | null;
  verified?: boolean;
  city?: string | null;
  rating_avg?: number;
  reviews_count?: number;
} | null) {
  if (!business) return undefined;
  return {
    name: business.name,
    slug: business.slug,
    logo_url: business.logo_url,
    verified: business.verified ?? false,
    city: business.city,
    rating_avg: business.rating_avg,
    reviews_count: business.reviews_count,
  };
}

export async function FeaturedMarketplace({
  services,
  products,
}: {
  services: ServiceWithBusiness[];
  products: ProductWithBusiness[];
}) {
  const t = await getTranslations("featured");
  const visServices = services.slice(0, 4);
  const visProducts = products.slice(0, 4);

  return (
    <section className="container-wide py-8">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        {/* Featured services */}
        <div>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
            <div>
              <p className="eyebrow">{t("eyebrow")}</p>
              <h2 className="mt-1 text-editorial text-2xl sm:text-3xl">
                {t("featuredServices")}
              </h2>
            </div>
            <Link
              href="/services"
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              {t("viewAll")}
              <ArrowUpRight className="size-4 rtl:rotate-180" />
            </Link>
          </div>

          {visServices.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
              {t("comingSoon")}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
              {visServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  seller={sellerFrom(service.business)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Featured products */}
        <div>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
            <div>
              <p className="eyebrow">{t("eyebrow")}</p>
              <h2 className="mt-1 text-editorial text-2xl sm:text-3xl">
                {t("featuredProducts")}
              </h2>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              {t("viewAll")}
              <ArrowUpRight className="size-4 rtl:rotate-180" />
            </Link>
          </div>

          {visProducts.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
              {t("comingSoon")}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
              {visProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  seller={sellerFrom(product.business)}
                  showSeller={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}