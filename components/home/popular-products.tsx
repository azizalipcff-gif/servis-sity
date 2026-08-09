import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Product } from "@/lib/supabase/database.types";

type Props = { products: (Product & { business?: { id: string; name: string | null; slug: string | null; logo_url: string | null } | null })[] };

export async function PopularProducts({ products }: Props) {
  const t = await getTranslations("featured");
  const visible = products.slice(0, 8);

  if (visible.length === 0) return null;

  return (
    <section className="container-wide pb-16 pt-4">
      <div className="mb-8 flex items-end justify-between gap-4 border-b border-border pb-5">
        <h2 className="text-editorial text-3xl sm:text-4xl">
          {t("popularProducts")}
        </h2>
        <Link
          href="/search?scope=products"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
        >
          {t("viewAll")}
          <ArrowUpRight className="size-4 rtl:rotate-180" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((product) => {
          const biz = product.business;
          const href = biz?.slug ? `/business/${biz.slug}` : "/search";
          return (
            <Link
              key={product.id}
              href={href}
              className="group block"
            >
              <div className="aspect-square w-full overflow-hidden bg-muted">
                {product.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-full w-full" />
                )}
              </div>
              <div className="flex items-start justify-between gap-2 pt-3">
                <div className="min-w-0">
                  <h3 className="line-clamp-1 text-[15px] font-medium group-hover:underline">
                    {product.name}
                  </h3>
                  {biz?.name && (
                    <p className="line-clamp-1 text-sm text-muted-foreground">
                      {biz.name}
                    </p>
                  )}
                  <p className="mt-1 text-sm font-semibold">
                    {product.price != null ? `${product.price} MAD` : "—"}
                  </p>
                </div>
                <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}