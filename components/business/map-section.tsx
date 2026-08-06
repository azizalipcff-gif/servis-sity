import { getTranslations } from "next-intl/server";
import { MapPin, Navigation } from "lucide-react";
import type { BusinessDetail } from "@/lib/queries";

export async function MapSection({ business }: { business: BusinessDetail }) {
  const t = await getTranslations("business");
  const dt = await getTranslations("business.detail");

  const hasLocation = Boolean(business.lat && business.lng);
  if (!hasLocation && !business.address) return null;

  const query = hasLocation
    ? `${business.lat},${business.lng}`
    : encodeURIComponent(business.address ?? "");

  const dirHref = hasLocation
    ? `https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address ?? "")}`;

  return (
    <section aria-label={t("addressTitle")}>
      <div className="flex items-center gap-2">
        <MapPin className="size-4 text-primary" />
        <h2 className="text-xl font-bold tracking-tight">
          {t("addressTitle")}
        </h2>
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border bg-card">
        <div className="relative">
          <iframe
            title={business.name}
            src={`https://maps.google.com/maps?q=${query}&z=15&output=embed`}
            className="h-64 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <a
            href={dirHref}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 start-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-2 text-xs font-semibold text-foreground shadow-md transition-transform hover:scale-105"
          >
            <Navigation className="size-3.5 text-primary" />
            {dt("getDirections")}
          </a>
        </div>
        {business.address && (
          <p className="flex items-center gap-2 px-5 py-3.5 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0 text-primary" />
            {business.address}
          </p>
        )}
      </div>
    </section>
  );
}