import { getTranslations } from "next-intl/server";
import { Clock, Sparkles } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/motion";
import { SmartImage } from "@/components/smart-image";
import { DEFAULT_PLACEHOLDER_IMAGES } from "@/lib/constants";
import { formatPrice, type Locale } from "@/lib/translations";
import type { BusinessDetail } from "@/lib/queries";

export async function ServicesSection({
  business,
  locale,
}: {
  business: BusinessDetail;
  locale: Locale;
}) {
  const t = await getTranslations("business");

  if (business.services.length === 0) {
    return (
      <section>
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">
            {t("services")}
          </h2>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("servicesEmpty")}
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-xl font-bold tracking-tight">
          {t("services")}
        </h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {business.services.length}
        </span>
      </div>

      <Stagger className="mt-5 grid gap-4 sm:grid-cols-2">
        {business.services.map((service) => (
          <StaggerItem key={service.id} className="h-full">
            <ServiceCard service={service} locale={locale} />
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

async function ServiceCard({
  service,
  locale,
}: {
  service: BusinessDetail["services"][number];
  locale: Locale;
}) {
  const t = await getTranslations("business");
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 hover:ring-1 hover:ring-primary/20">
      {service.photo_url && (
        <div className="relative aspect-[16/9] overflow-hidden">
          <SmartImage
            src={service.photo_url}
            alt={service.name}
            fallback={DEFAULT_PLACEHOLDER_IMAGES.business}
            sizes="(min-width: 640px) 50vw, 100vw"
            imgClassName="transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          {service.price != null && (
            <span className="absolute bottom-3 start-3 rounded-full bg-white/95 px-3 py-1 text-sm font-bold text-foreground shadow-sm">
              {formatPrice(service.price, locale)}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold tracking-tight">
          {service.name}
        </h3>
        {service.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
            {service.description}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="size-3.5" />
            {service.duration_minutes
              ? `${service.duration_minutes} ${t("minutes")}`
              : "—"}
          </span>
          <a
            href="#book"
            className="inline-flex items-center rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/20 transition-all hover:bg-primary hover:text-primary-foreground"
          >
            {t("bookNow")}
          </a>
        </div>
      </div>
    </article>
  );
}