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
      <h2 className="text-lg font-semibold tracking-tight">
        {t("addressTitle")}
      </h2>

      <div className="mt-4 overflow-hidden rounded-2xl border bg-card">
        <iframe
          title={business.name}
          src={`https://maps.google.com/maps?q=${query}&z=15&output=embed`}
          className="h-60 w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />

        {business.address && (
          <p className="flex items-center gap-2 border-t border-border px-5 py-3 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0 text-primary" />
            <span className="min-w-0 truncate">{business.address}</span>
          </p>
        )}

        <div className="border-t border-border p-3">
          <a
            href={dirHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-background px-4 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Navigation className="size-4 text-primary" />
            {dt("getDirections")}
          </a>
        </div>
      </div>
    </section>
  );
}