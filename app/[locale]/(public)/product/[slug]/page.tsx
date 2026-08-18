import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowUpRight,
  BadgeCheck,
  ChevronRight,
  Home,
  MapPin,
  Package,
  Store,
} from "lucide-react";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { FadeIn } from "@/components/motion";
import { Gallery } from "@/components/business/gallery";
import { ProductCard } from "@/components/products/product-card";
import { ProductDetailHero } from "@/components/products/product-detail-hero";
import { RatingStars } from "@/components/rating-stars";
import { SmartImage } from "@/components/smart-image";
import { Button } from "@/components/ui/button";
import { DEFAULT_PLACEHOLDER_IMAGES } from "@/lib/constants";
import { toJsonLd } from "@/lib/security/sanitize";
import { absoluteUrl, imageUrl, localizedLanguages } from "@/lib/seo";
import {
  getProductBySlug,
  getProductsForBusiness,
  getSimilarProducts,
  type ProductBusiness,
} from "@/lib/queries";
import { formatPrice, localizedName, type Locale } from "@/lib/translations";
import { businessHref } from "@/lib/business/url";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product)
    return { title: "Not found", description: "Product not found" };

  const t = await getTranslations({ locale, namespace: "meta" });
  const title = product.seo_title || `${product.name} · Service City`;
  const description =
    product.seo_description ||
    product.description?.slice(0, 155) ||
    t("title");
  const url = absoluteUrl(`/${locale}/product/${slug}`);
  const ogImage =
    imageUrl(product.images?.[0]) || absoluteUrl("/branding/service-city-logo.png");

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: localizedLanguages(`/product/${slug}`),
    },
    openGraph: {
      title,
      description,
      type: "website",
      url,
      siteName: "Service City",
      images: [{ url: ogImage, width: 1200, height: 630, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("product");
  const tb = await getTranslations("business");
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [businessProducts, similar] = await Promise.all([
    product.business
      ? getProductsForBusiness(product.business.id)
      : Promise.resolve([]),
    getSimilarProducts(product.category_id, product.id, 4),
  ]);

  const biz = product.business;
  const more =
    biz && businessProducts.length > 0
      ? businessProducts
          .filter((p) => p.status === "published" && p.id !== product.id)
          .slice(0, 4)
      : [];

  const categoryName = product.categories
    ? localizedName(product.categories, locale as Locale)
    : null;
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock > 0 && product.stock < 5;
  const hasDiscount =
    product.compare_at_price != null && product.compare_at_price > product.price;
  const discountPct =
    hasDiscount && product.compare_at_price
      ? Math.round((1 - product.price / product.compare_at_price) * 100)
      : 0;

  const productJsonLd = toJsonLd({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images?.map((url) => imageUrl(url)),
    description: product.description ?? undefined,
    sku: product.sku ?? undefined,
    brand: biz ? { "@type": "Brand", name: biz.name } : undefined,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "MAD",
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  });

  return (
    <div className="pb-24 lg:pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: productJsonLd }}
      />

      {/* Cinematic hero — first visual element below the navbar */}
      <ProductDetailHero product={product} />

      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="container-site mt-5 flex items-center gap-2 text-[13px] text-muted-foreground"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <Home className="size-3.5" />
          <span>{tb("home")}</span>
        </Link>
        <ChevronRight
          className="size-3.5 shrink-0 text-muted-foreground/60 rtl:rotate-180"
          aria-hidden
        />
        {product.categories ? (
          <Link
            href={`/products?category=${product.categories.slug}`}
            className="max-w-40 truncate transition-colors hover:text-foreground"
          >
            {categoryName}
          </Link>
        ) : null}
        <ChevronRight
          className="size-3.5 shrink-0 text-muted-foreground/60 rtl:rotate-180"
          aria-hidden
        />
        <span className="truncate font-medium text-foreground">
          {product.name}
        </span>
      </nav>

      <div className="container-site mt-6 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
        {/* Main column */}
        <div className="min-w-0 space-y-10">
          <FadeIn>
            {product.images?.length ? (
              <Gallery
                images={product.images.map((url) => ({ id: url, url }))}
                title={product.name}
                businessId={product.business?.id ?? ""}
              />
            ) : (
              <div className="grid aspect-square w-full place-items-center overflow-hidden rounded-2xl bg-muted">
                <Package className="size-16 text-primary/40" />
              </div>
            )}
          </FadeIn>

          {product.description && (
            <FadeIn>
              <section>
                <h2 className="text-lg font-semibold">{t("description")}</h2>
                <p className="mt-3 max-w-2xl whitespace-pre-line leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              </section>
            </FadeIn>
          )}

          {product.tags.length > 0 && (
            <FadeIn>
              <section>
                <h2 className="text-lg font-semibold">{t("tags")}</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {product.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </section>
            </FadeIn>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 lg:sticky lg:top-24">
          <FadeIn>
            <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
                  {formatPrice(product.price, locale as Locale)}
                </p>
                {hasDiscount && product.compare_at_price && (
                  <s className="text-sm tabular-nums text-muted-foreground">
                    {formatPrice(product.compare_at_price, locale as Locale)}
                  </s>
                )}
                {hasDiscount && (
                  <span className="inline-flex items-center rounded-sm bg-gold px-1.5 py-0.5 text-xs font-bold leading-none text-black">
                    −{discountPct}%
                  </span>
                )}
              </div>

              <p
                className={`mt-3 text-sm font-medium ${
                  outOfStock ? "text-destructive" : "text-success"
                }`}
              >
                {outOfStock
                  ? t("outOfStock")
                  : lowStock
                    ? t("lowStock", { count: product.stock })
                    : t("inStock")}
              </p>

              {(product.sku || product.views > 0) && (
                <dl className="mt-5 space-y-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
                  {product.sku && (
                    <div className="flex items-center justify-between gap-2">
                      <dt>{t("sku")}</dt>
                      <dd className="font-medium text-foreground">{product.sku}</dd>
                    </div>
                  )}
                  {product.views > 0 && (
                    <div className="flex items-center justify-between gap-2">
                      <dt>{t("viewsLabel")}</dt>
                      <dd className="font-medium tabular-nums text-foreground">
                        {product.views.toLocaleString(locale)}
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </aside>
          </FadeIn>

          {biz && (
            <FadeIn>
              <SellerCard business={biz} t={t} tb={tb} />
            </FadeIn>
          )}
        </div>
      </div>

      {/* More from this business */}
      {more.length > 0 && (
        <section className="container-site mt-14">
          <div className="mb-5 border-b border-border pb-4">
            <h2 className="text-editorial text-2xl sm:text-3xl">
              {t("moreFromBusiness")}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {more.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                seller={p.business ?? undefined}
              />
            ))}
          </div>
        </section>
      )}

      {/* Similar products */}
      {similar.length > 0 && (
        <section className="container-site mt-14">
          <div className="mb-5 border-b border-border pb-4">
            <h2 className="text-editorial text-2xl sm:text-3xl">
              {t("similarProducts")}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Browse more */}
      <div className="container-site mt-14 flex flex-col items-center gap-3 border-t border-border pt-8 text-center">
        <p className="eyebrow">{t("browseAllEyebrow")}</p>
        <h2 className="text-editorial text-2xl">{t("browseAllTitle")}</h2>
        <Button asChild className="mt-2">
          <Link href="/products">
            {t("browseAllCta")}
            <ArrowUpRight className="size-4 rtl:rotate-180" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function SellerCard({
  business,
  t,
  tb,
}: {
  business: ProductBusiness;
  t: Awaited<ReturnType<typeof getTranslations>>;
  tb: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const href = businessHref(business);
  return (
    <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("seller")}
      </h2>
      <Link href={href} className="group mt-3 flex items-center gap-3">
        {business.logo_url ? (
          <span className="size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
            <SmartImage
              src={business.logo_url}
              alt={business.name ?? ""}
              fallback={DEFAULT_PLACEHOLDER_IMAGES.logo}
              className="h-full w-full"
              imgClassName="object-cover"
            />
          </span>
        ) : (
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            <Store className="size-6" />
          </span>
        )}
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="line-clamp-1 font-semibold group-hover:underline">
              {business.name}
            </span>
            {business.verified && (
              <span title={tb("verified")}>
                <BadgeCheck className="size-4 shrink-0 fill-primary/15 text-primary" />
              </span>
            )}
          </span>
          {business.city && (
            <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              {business.city}
            </span>
          )}
        </span>
      </Link>

      {business.rating_avg > 0 && (
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <RatingStars rating={business.rating_avg} size="size-3.5" />
          <span className="text-sm font-semibold">
            {business.rating_avg.toFixed(1)}
          </span>
          <span className="text-xs text-muted-foreground">
            {business.reviews_count > 0
              ? tb("reviews", { count: business.reviews_count })
              : tb("noReviews")}
          </span>
        </div>
      )}

      <Button asChild variant="outline" className="mt-4 w-full">
        <Link href={href}>
          {t("visitBusiness")}
          <ArrowUpRight className="size-4 rtl:rotate-180" />
        </Link>
      </Button>
    </aside>
  );
}
