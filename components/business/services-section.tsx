import { getTranslations } from "next-intl/server";
import { Clock } from "lucide-react";
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
        <h2 className="text-lg font-semibold tracking-tight">
          {t("services")}
        </h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          {t("servicesEmpty")}
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-baseline gap-2.5">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("services")}
        </h2>
        <span className="text-sm text-muted-foreground">
          {business.services.length}
        </span>
      </div>

      <div className="mt-4 divide-y divide-border rounded-xl border bg-card">
        {business.services.map((service) => (
          <ServiceRow key={service.id} service={service} locale={locale} />
        ))}
      </div>
    </section>
  );
}

async function ServiceRow({
  service,
  locale,
}: {
  service: BusinessDetail["services"][number];
  locale: Locale;
}) {
  const t = await getTranslations("business");
  return (
    <article className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-5">
      {service.photo_url && (
        <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-lg sm:w-28">
          <SmartImage
            src={service.photo_url}
            alt={service.name}
            fallback={DEFAULT_PLACEHOLDER_IMAGES.business}
            sizes="160px"
            imgClassName="object-cover"
          />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-semibold tracking-tight">
          {service.name}
        </h3>
        {service.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
            {service.description}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
          {service.price != null && (
            <span className="font-semibold text-foreground">
              {formatPrice(service.price, locale)}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {service.duration_minutes ? `${service.duration_minutes} ${t("minutes")}` : "—"}
          </span>
        </div>
      </div>

      <a
        href="#book"
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground"
      >
        {t("bookNow")}
      </a>
    </article>
  );
}