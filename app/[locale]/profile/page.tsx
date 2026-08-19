import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Heart,
  ListChecks,
  MapPin,
  MessageSquare,
  Package,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/user";
import {
  getWorkspaceData,
  profileCompletion,
  type BusinessSummary,
  type WorkspaceProduct,
  type WorkspaceService,
} from "@/lib/workspace";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/rating-stars";
import { SmartImage } from "@/components/smart-image";
import { StatusBadge } from "@/components/profile/status-badge";
import { EmptyCard } from "@/components/profile/empty-card";
import { localizedName, formatPrice, type Locale } from "@/lib/translations";
import { businessHref } from "@/lib/business/url";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ProfileOverviewPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const t = await getTranslations("workspace");
  const tBiz = await getTranslations("business");

  const data = await getWorkspaceData(user?.id ?? "");
  const completion = profileCompletion(data.profile);

  const displayName =
    data.profile?.full_name || data.profile?.username || data.profile?.city || "";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-editorial text-3xl sm:text-4xl">
          {t("overview.greeting", { name: displayName })}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
          {t("overview.tagline")}
        </p>
      </header>

      {/* Real stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          icon={Building2}
          value={data.businesses.length}
          label={t("overview.statBusinesses")}
          href="/profile/business"
        />
        <StatCard
          icon={Wrench}
          value={data.services.length}
          label={t("overview.statServices")}
          href="/profile/services"
        />
        <StatCard
          icon={Package}
          value={data.products.length}
          label={t("overview.statProducts")}
          href="/profile/products"
        />
        <StatCard
          icon={MessageSquare}
          value={data.unreadMessages}
          label={t("overview.statMessages")}
          href="/messenger"
          highlight={data.unreadMessages > 0}
        />
        <StatCard
          icon={Heart}
          value={data.favoritesCount}
          label={t("overview.statFavorites")}
          href="/profile/favorites"
        />
      </div>

      {/* Completion + My Business */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CompletionCard
          done={completion.done}
          total={completion.total}
          pct={completion.pct}
          t={t as (key: string) => string}
        />

        {data.businesses.length > 0 ? (
          <BusinessSummaryCard
            business={data.businesses[0]}
            locale={locale as Locale}
            t={t as (key: string) => string}
          />
        ) : (
          <EmptyCard
            icon={<Building2 className="size-6" />}
            title={t("business.emptyTitle")}
            description={t("business.emptyDesc")}
            action={
              <Button asChild>
                <Link href="/dashboard/business/new">
                  <PlusIcon />
                  {t("business.create")}
                </Link>
              </Button>
            }
          />
        )}
      </div>

      {/* Services + Products */}
      <div className="grid gap-4 lg:grid-cols-2">
        {data.services.length > 0 ? (
          <CollectionCard
            icon={Wrench}
            title={t("services.title")}
            count={data.services.length}
            unit={t("services.unit")}
            href="/profile/services"
            viewAll={t("services.viewAll")}
          >
            <ul className="space-y-2">
              {data.services.slice(0, 3).map((s) => (
                <ServiceRow
                  key={s.id}
                  service={s}
                  locale={locale as Locale}
                  minutes={tBiz("minutes")}
                />
              ))}
            </ul>
          </CollectionCard>
        ) : (
          <EmptyCard
            icon={<Wrench className="size-6" />}
            title={t("services.emptyTitle")}
            description={
              data.businesses.length > 0
                ? t("services.emptyDesc")
                : t("pagesServices.noBusinessDesc")
            }
            action={
              data.businesses.length > 0 ? (
                <Button asChild>
                  <Link href="/dashboard/services/new">
                    <PlusIcon />
                    {t("services.add")}
                  </Link>
                </Button>
              ) : (
                <Button disabled>
                  <PlusIcon />
                  {t("services.add")}
                </Button>
              )
            }
          />
        )}

        {data.products.length > 0 ? (
          <CollectionCard
            icon={Package}
            title={t("products.title")}
            count={data.products.length}
            unit={t("products.unit")}
            href="/profile/products"
            viewAll={t("products.viewAll")}
          >
            <ul className="space-y-2">
              {data.products.slice(0, 3).map((p) => (
                <ProductRow key={p.id} product={p} locale={locale as Locale} />
              ))}
            </ul>
          </CollectionCard>
        ) : (
          <EmptyCard
            icon={<Package className="size-6" />}
            title={t("products.emptyTitle")}
            description={
              data.businesses.length > 0
                ? t("products.emptyDesc")
                : t("pagesProducts.noBusinessDesc")
            }
            action={
              data.businesses.length > 0 ? (
                <Button asChild>
                  <Link href="/dashboard/products/new">
                    <PlusIcon />
                    {t("products.add")}
                  </Link>
                </Button>
              ) : (
                <Button disabled>
                  <PlusIcon />
                  {t("products.add")}
                </Button>
              )
            }
          />
        )}
      </div>

      {/* Messages + Favorites */}
      <div className="grid gap-4 lg:grid-cols-2">
        <LinkCard
          icon={MessageSquare}
          title={t("messages.title")}
          description={data.unreadMessages > 0 ? t("messages.desc") : t("messages.empty")}
          badge={data.unreadMessages}
          href="/messenger"
          cta={t("messages.open")}
        />
        <LinkCard
          icon={Heart}
          title={t("favorites.title")}
          description={data.favoritesCount > 0 ? t("favorites.desc") : t("favorites.empty")}
          badge={data.favoritesCount}
          href="/profile/favorites"
          cta={t("favorites.open")}
        />
      </div>
    </div>
  );
}

/* ------------------------------ building blocks ------------------------------ */

function PlusIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="size-4"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  href,
  highlight,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
    >
      <div className="flex items-center justify-between">
        <span
          className={
            highlight
              ? "grid size-9 place-items-center rounded-xl bg-accent/10 text-accent"
              : "grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"
          }
        >
          <Icon className="size-4" />
        </span>
        <ArrowRight className="size-4 text-muted-foreground/40 transition-colors group-hover:text-primary rtl:rotate-180" />
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </Link>
  );
}

function CompletionCard({
  done,
  total,
  pct,
  t,
}: {
  done: number;
  total: number;
  pct: number;
  t: (key: string) => string;
}) {
  const complete = done >= total;
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="size-4 text-primary" />
          {t("overview.completionTitle")}
        </h3>
        <span className="text-sm font-bold tabular-nums text-primary">
          {done}/{total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("overview.completionTitle")}
        className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {complete ? t("overview.completionDone") : t("overview.completionHint")}
      </p>
      {!complete && (
        <Button variant="outline" size="sm" className="mt-4 self-start" asChild>
          <Link href="/profile/settings">{t("overview.completionCta")}</Link>
        </Button>
      )}
    </div>
  );
}

function BusinessSummaryCard({
  business,
  locale,
  t,
}: {
  business: BusinessSummary;
  locale: Locale;
  t: (key: string) => string;
}) {
  const pageHref = business.slug ? businessHref(business) : null;
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
            {business.logo_url ? (
              <SmartImage
                src={business.logo_url}
                alt=""
                className="size-full"
                imgClassName="object-cover"
              />
            ) : (
              <Building2 className="size-5 text-primary" />
            )}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold tracking-tight">{business.name}</h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              {localizedName(business.categories, locale) && (
                <span>{localizedName(business.categories, locale)}</span>
              )}
              {business.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" />
                  {business.city}
                </span>
              )}
            </div>
          </div>
        </div>
        <StatusBadge status={business.status} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <RatingStars rating={business.rating_avg} size="size-3.5" />
          <span className="font-semibold tabular-nums">
            {business.rating_avg > 0 ? business.rating_avg.toFixed(1) : "—"}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          {business.servicesCount} {t("business.services")}
        </span>
        <span className="text-xs text-muted-foreground">
          {business.productsCount} {t("business.products")}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button size="sm" asChild>
          <Link href="/dashboard">{t("business.manage")}</Link>
        </Button>
        {pageHref && (
          <Button variant="outline" size="sm" asChild>
            <Link href={pageHref} target="_blank" rel="noopener noreferrer">
              <ArrowUpRight className="size-3.5 rtl:rotate-180" />
              {t("business.view")}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function CollectionCard({
  icon: Icon,
  title,
  count,
  unit,
  href,
  viewAll,
  children,
}: {
  icon: LucideIcon;
  title: string;
  count: number;
  unit: string;
  href: string;
  viewAll: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-primary" />
          {title}
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold tabular-nums text-muted-foreground">
            {count} {unit}
          </span>
        </h3>
        <Link href={href} className="text-xs font-semibold text-primary underline-offset-4 hover:underline">
          {viewAll}
        </Link>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ServiceRow({
  service,
  locale,
  minutes,
}: {
  service: WorkspaceService;
  locale: Locale;
  minutes: string;
}) {
  const href = service.business?.slug ? businessHref(service.business) : null;
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-2">
      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
        {service.photo_url ? (
          <SmartImage src={service.photo_url} alt="" className="size-full" imgClassName="object-cover" />
        ) : (
          <Wrench className="size-4 text-primary" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          href={href ?? "/dashboard"}
          className="block truncate text-sm font-medium text-foreground hover:underline"
        >
          {service.name}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {service.price != null ? formatPrice(service.price, locale) : "—"}
          {service.duration_minutes
            ? ` · ${service.duration_minutes} ${minutes}`
            : ""}
        </p>
      </div>
      <StatusBadge status={service.status} />
    </li>
  );
}

function ProductRow({ product, locale }: { product: WorkspaceProduct; locale: Locale }) {
  const href = product.business?.slug ? businessHref(product.business) : null;
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-2">
      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
        {product.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.images[0]} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <Package className="size-4 text-primary" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          href={href ?? "/dashboard"}
          className="block truncate text-sm font-medium text-foreground hover:underline"
        >
          {product.name}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {product.price != null ? formatPrice(product.price, locale) : "—"}
        </p>
      </div>
      <StatusBadge status={product.status} />
    </li>
  );
}

function LinkCard({
  icon: Icon,
  title,
  description,
  badge,
  href,
  cta,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  badge: number;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-semibold">
          {title}
          {badge > 0 && (
            <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold text-white">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-sm text-muted-foreground">{description}</span>
        <span className="mt-1 block text-xs font-semibold text-primary">{cta}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-primary rtl:rotate-180" />
    </Link>
  );
}