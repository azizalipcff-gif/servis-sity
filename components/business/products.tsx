import { getTranslations } from "next-intl/server";
import type { Product } from "@/lib/supabase/database.types";

export async function BusinessProducts({ products }: { products: Product[] }) {
  const t = await getTranslations("products");
  const published = products.filter((p) => p.status === "published");

  if (published.length === 0) return null;

  return (
    <section className="space-y-5">
      <h2 className="text-xl font-bold tracking-tight">{t("title")}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {published.map((product) => (
          <div
            key={product.id}
            className="group overflow-hidden rounded-2xl border bg-card"
          >
            <div className="aspect-square w-full overflow-hidden bg-muted">
              {product.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-full w-full" />
              )}
            </div>
            <div className="p-3">
              <h3 className="line-clamp-1 text-sm font-medium">{product.name}</h3>
              <p className="mt-1 font-bold text-primary">
                {product.price != null ? `${product.price} MAD` : "—"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}