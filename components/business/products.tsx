import { getTranslations } from "next-intl/server";
import { ProductCard } from "@/components/products/product-card";
import type { Product } from "@/lib/supabase/database.types";

export async function BusinessProducts({
  products,
  business,
}: {
  products: Product[];
  business: {
    name: string | null;
    slug: string;
    logo_url: string | null;
    verified: boolean;
  };
}) {
  const t = await getTranslations("products");
  const published = products.filter((p) => p.status === "published");

  if (published.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {published.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            seller={{
              name: business.name,
              slug: business.slug,
              logo_url: business.logo_url,
              verified: business.verified,
            }}
          />
        ))}
      </div>
    </section>
  );
}