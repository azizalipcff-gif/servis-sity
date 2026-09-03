import { getTranslations } from "next-intl/server";
import { ServiceCard } from "@/components/services/service-card";
import { ProductCard } from "@/components/products/product-card";
import { BusinessCard } from "@/components/business-card";
import type {
  BusinessWithCategory,
  ProductWithBusiness,
  ServiceWithBusiness,
} from "@/lib/queries";

type MarketplaceItem =
  | { type: "service"; item: ServiceWithBusiness }
  | { type: "product"; item: ProductWithBusiness }
  | { type: "business"; item: BusinessWithCategory };

export async function FeaturedMarketplace({
  items,
}: {
  items: MarketplaceItem[];
}) {
  const t = await getTranslations("featured");

  return (
    <section className="container-wide py-8" aria-label="Marketplace">
      <div className="mb-6 flex items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 className="mt-1 text-editorial text-2xl sm:text-3xl">Servis Sity Marketplace</h1>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {items.map(({ type, item }) => {
            if (type === "service") {
              return <ServiceCard key={`service-${item.id}`} service={item} seller={item.business ?? undefined} />;
            }
            if (type === "product") {
              return <ProductCard key={`product-${item.id}`} product={item} seller={item.business ?? undefined} showSeller={false} />;
            }
            return <BusinessCard key={`business-${item.id}`} business={item} />;
          })}
        </div>
      )}
    </section>
  );
}
