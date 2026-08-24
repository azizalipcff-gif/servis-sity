import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, Clock, Pencil, Wrench } from "lucide-react";
import {
  getWorkspaceData,
  getWorkspaceState,
  type WorkspaceService,
} from "@/lib/workspace";
import { WORKSPACE_ADD_SERVICE_HREF } from "@/lib/workspace/actions";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ItemActions } from "@/components/profile/item-actions";
import { SmartImage } from "@/components/smart-image";
import { StatusBadge } from "@/components/profile/status-badge";
import { WorkspaceEmptyState } from "@/components/profile/workspace-empty-state";
import { formatPrice, type Locale } from "@/lib/translations";
import { businessHref } from "@/lib/business/url";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ProfileServicesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const state = await getWorkspaceState();
  const t = await getTranslations("workspace");
  const tBiz = await getTranslations("business");

  if (!state.user) return null;

  const data = await getWorkspaceData(state);
  const addHref = WORKSPACE_ADD_SERVICE_HREF;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-editorial text-2xl sm:text-3xl">{t("pagesServices.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("pagesServices.desc")}</p>
        </div>
        {data.services.length > 0 && (
          <Button asChild>
            <Link href={addHref}>{t("services.add")}</Link>
          </Button>
        )}
      </header>

      {data.services.length === 0 ? (
        <WorkspaceEmptyState
          hasBusiness={state.hasBusiness}
          entity="services"
          error={state.error}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              locale={locale as Locale}
              minutes={tBiz("minutes")}
              t={t as (key: string) => string}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceCard({
  service,
  locale,
  minutes,
  t,
}: {
  service: WorkspaceService;
  locale: Locale;
  minutes: string;
  t: (key: string) => string;
}) {
  const viewHref = service.business?.slug ? businessHref(service.business) : null;
  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft">
      <ItemActions
        kind="service"
        id={service.id}
        itemName={service.name}
        status={service.status}
        editHref={`/dashboard/services/${service.id}/edit`}
        viewHref={service.business?.slug ? businessHref(service.business) : undefined}
        shareUrl={service.business?.slug ? businessHref(service.business) : undefined}
        canDelete={service.status === "archived"}
        enablePin
        pinned={service.featured}
        apiBase="/api/dashboard/services"
      />
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {service.photo_url ? (
          <SmartImage
            src={service.photo_url}
            alt={service.name}
            className="absolute inset-0 h-full w-full"
            imgClassName="object-cover"
          />
        ) : (
          <span className="grid h-full w-full place-items-center">
            <Wrench className="size-8 text-primary/50" />
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="line-clamp-1 font-semibold tracking-tight">{service.name}</h2>
          <StatusBadge status={service.status} />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {service.business?.name && (
            <span className="truncate">{service.business.name}</span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-base font-bold tabular-nums text-foreground">
            {service.price != null ? formatPrice(service.price, locale) : "—"}
          </p>
          {service.duration_minutes ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              {service.duration_minutes} {minutes}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={viewHref ?? "/dashboard"}>
              <ArrowUpRight className="size-3.5 rtl:rotate-180" />
              {t("services.view")}
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/dashboard/services/${service.id}/edit`}>
              <Pencil className="size-3.5" />
              {t("services.edit")}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}