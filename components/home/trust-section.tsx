import { getTranslations } from "next-intl/server";
import { FadeIn } from "@/components/motion";

export async function TrustSection({
  businessCount,
  cityCount,
  bookingCount,
}: {
  businessCount: number;
  cityCount: number;
  bookingCount: number;
}) {
  const t = await getTranslations("trust");

  const stats = [
    { label: t("businesses", { count: businessCount }), value: businessCount },
    { label: t("cities", { count: cityCount }), value: cityCount },
    { label: t("bookings", { count: bookingCount }), value: bookingCount },
  ];

  return (
    <section className="container-wide pb-4">
      <FadeIn>
        <div className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col gap-2 py-10 text-center sm:px-6">
              <span className="text-editorial text-5xl md:text-6xl">
                {new Intl.NumberFormat().format(stat.value)}+
              </span>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}