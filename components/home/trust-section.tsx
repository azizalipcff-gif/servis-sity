import { CalendarCheck, Building2, MapPin } from "lucide-react";
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
    {
      icon: Building2,
      label: t("businesses", { count: businessCount }),
      value: businessCount,
    },
    {
      icon: MapPin,
      label: t("cities", { count: cityCount }),
      value: cityCount,
    },
    {
      icon: CalendarCheck,
      label: t("bookings", { count: bookingCount }),
      value: bookingCount,
    },
  ];

  return (
    <section className="border-t bg-primary text-primary-foreground">
      <div className="container-site py-14">
        <FadeIn>
          <h2 className="text-center text-2xl font-bold md:text-3xl">
            {t("title")}
          </h2>
        </FadeIn>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <FadeIn key={i} delay={i * 0.08}>
                <div className="flex flex-col items-center gap-2 text-center">
                  <Icon className="size-7 opacity-90" />
                  <span className="text-3xl font-bold">
                    {new Intl.NumberFormat().format(stat.value)}+
                  </span>
                  <span className="text-sm text-primary-foreground/85">
                    {stat.label}
                  </span>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
