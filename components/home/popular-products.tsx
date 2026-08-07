import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Product } from "@/lib/supabase/database.types";

type Props = { products: (Product & { business?: { id: string; name: string | null; slug: string | null; logo_url: string | null } | null })[] };

export async function PopularProducts({ products }: Props) {
  const t = await getTranslations("featured");
  const visible = products.slice(0, 8);

  if (visible.length === 0) return null;

  return (
    <section className="container-site py-10">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{t("popularProducts")}</h2>
        <Link
          href="/search?scope=products"
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("viewAll")}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((product) => {
          const biz = product.business;
          const href = biz?.slug ? `/business/${biz.slug}` : "/search";
          return (
            <Link
              key={product.id}
              href={href}
              className="group overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md"
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
                {biz?.name && (
                  <p className="line-clamp-1 text-xs text-muted-foreground">{biz.name}</p>
                )}
                <p className="mt-1 text-sm font-bold text-primary">
                  {product.price != null ? `${product.price} MAD` : "—"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}