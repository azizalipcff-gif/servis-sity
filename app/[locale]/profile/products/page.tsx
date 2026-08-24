import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, Package, Pencil } from "lucide-react";
import {
  getWorkspaceData,
  getWorkspaceState,
  type WorkspaceProduct,
} from "@/lib/workspace";
import { WORKSPACE_ADD_PRODUCT_HREF } from "@/lib/workspace/actions";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ItemActions } from "@/components/profile/item-actions";
import { SmartImage } from "@/components/smart-image";
import { StatusBadge } from "@/components/profile/status-badge";
import { WorkspaceEmptyState } from "@/components/profile/workspace-empty-state";
import { formatPrice, type Locale } from "@/lib/translations";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ProfileProductsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const state = await getWorkspaceState();
  const t = await getTranslations("workspace");

  if (!state.user) return null;

  const data = await getWorkspaceData(state);
  const addHref = WORKSPACE_ADD_PRODUCT_HREF;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-editorial text-2xl sm:text-3xl">{t("pagesProducts.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("pagesProducts.desc")}</p>
        </div>
        {data.products.length > 0 && (
          <Button asChild>
            <Link href={addHref}>{t("products.add")}</Link>
          </Button>
        )}
      </header>

      {data.products.length === 0 ? (
        <WorkspaceEmptyState
          hasBusiness={state.hasBusiness}
          entity="products"
          error={state.error}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              locale={locale as Locale}
              t={t as (key: string) => string}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product,
  locale,
  t,
}: {
  product: WorkspaceProduct;
  locale: Locale;
  t: (key: string) => string;
}) {
  const viewHref = product.slug ? `/product/${product.slug}` : null;
  const image = product.images[0];
  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft">
      <ItemActions
        kind="product"
        id={product.id}
        itemName={product.name}
        status={product.status}
        editHref={`/dashboard/products/${product.id}/edit`}
        viewHref={product.slug ? `/product/${product.slug}` : undefined}
        shareUrl={product.slug ? `/product/${product.slug}` : undefined}
        canDelete={product.status === "archived"}
        enablePin
        pinned={product.featured}
        apiBase="/api/dashboard/products"
      />
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {image ? (
          <SmartImage
            src={image}
            alt={product.name}
            className="absolute inset-0 h-full w-full"
            imgClassName="object-cover"
          />
        ) : (
          <span className="grid h-full w-full place-items-center">
            <Package className="size-8 text-primary/50" />
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="line-clamp-1 font-semibold tracking-tight">{product.name}</h2>
          <StatusBadge status={product.status} />
        </div>

        <div className="mt-1 truncate text-xs text-muted-foreground">
          {product.business?.name ?? ""}
        </div>

        <p className="mt-3 border-t border-border pt-3 text-base font-bold tabular-nums text-foreground">
          {formatPrice(product.price, locale)}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={viewHref ?? "/dashboard"}>
              <ArrowUpRight className="size-3.5 rtl:rotate-180" />
              {t("products.view")}
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/dashboard/products/${product.id}/edit`}>
              <Pencil className="size-3.5" />
              {t("products.edit")}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}