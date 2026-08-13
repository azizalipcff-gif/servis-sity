import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/components/products/product-card";
import type { Product } from "@/lib/supabase/database.types";

type Props = {
  products: (Product & {
    business?: {
      id: string;
      name: string | null;
      slug: string | null;
      logo_url: string | null;
    } | null;
  })[];
};

export async function PopularProducts({ products }: Props) {
  const t = await getTranslations("featured");
  const visible = products.slice(0, 8);

  if (visible.length === 0) return null;

  return (
    <section className="container-wide pb-16 pt-4">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2 className="mt-1 text-editorial text-2xl sm:text-3xl">
            {t("popularProducts")}
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

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}