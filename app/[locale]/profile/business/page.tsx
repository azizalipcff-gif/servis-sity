import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, Building2, MapPin } from "lucide-react";
import {
  getWorkspaceData,
  getWorkspaceState,
  type BusinessSummary,
} from "@/lib/workspace";
import { WORKSPACE_MANAGE_BUSINESS_HREF } from "@/lib/workspace/actions";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ItemActions } from "@/components/profile/item-actions";
import { RatingStars } from "@/components/rating-stars";
import { SmartImage } from "@/components/smart-image";
import { StatusBadge } from "@/components/profile/status-badge";
import { WorkspaceEmptyState } from "@/components/profile/workspace-empty-state";
import { localizedName, type Locale } from "@/lib/translations";
import { businessHref } from "@/lib/business/url";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ProfileBusinessPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const state = await getWorkspaceState();
  const t = await getTranslations("workspace");

  if (!state.user) return null;

  const data = await getWorkspaceData(state);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-editorial text-2xl sm:text-3xl">{t("pagesBusiness.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("pagesBusiness.desc")}</p>
        </div>
        {data.businesses.length > 0 && (
          <Button asChild>
            <Link href={WORKSPACE_MANAGE_BUSINESS_HREF}>{t("business.manage")}</Link>
          </Button>
        )}
      </header>

      {data.businesses.length === 0 ? (
        <WorkspaceEmptyState
          hasBusiness={state.hasBusiness}
          entity="business"
          error={state.error}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.businesses.map((business) => (
            <BusinessCard
              key={business.id}
              business={business}
              locale={locale as Locale}
              t={t as (key: string) => string}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BusinessCard({
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
    <article className="relative flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft">
      <ItemActions
        kind="business"
        id={business.id}
        itemName={business.name}
        status={business.status}
        editHref="/dashboard/business/edit"
        viewHref={pageHref ?? undefined}
        shareUrl={pageHref ?? undefined}
        canDelete={false}
        apiBase="/api/dashboard/business"
      />
      <div className="flex items-start justify-between gap-3 pe-12">
        <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-muted">
          {business.logo_url ? (
            <SmartImage
              src={business.logo_url}
              alt={business.name}
              className="size-full"
              imgClassName="object-cover"
            />
          ) : (
            <Building2 className="size-6 text-primary" />
          )}
        </span>
        <StatusBadge status={business.status} />
      </div>

      <h2 className="mt-4 truncate text-lg font-semibold tracking-tight">{business.name}</h2>

      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
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

      {business.description && (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {business.description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
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
          <Link href="/dashboard/business/edit">{t("business.edit")}</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
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
    </article>
  );
}