import { getLocale, getTranslations } from "next-intl/server";
import { FadeIn } from "@/components/motion";

export async function TrustSection({
  businessCount,
  cityCount,
}: {
  businessCount: number;
  cityCount: number;
}) {
  const t = await getTranslations("trust");
  const locale = await getLocale();
  const numberLocale = locale === "ar" ? "ar-MA" : locale;

  const stats = [
    { label: t("businesses", { count: businessCount }), value: businessCount },
    { label: t("cities", { count: cityCount }), value: cityCount },
  ];

  return (
    <section className="container-wide pb-4" aria-labelledby="trust-section-title">
      <FadeIn>
        <div className="mb-4 text-center">
          <h2 id="trust-section-title" className="text-lg font-semibold">{t("title")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("demoNotice")}</p>
        </div>
        <div className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col gap-2 py-10 text-center sm:px-6">
              <span className="text-editorial text-5xl md:text-6xl">
                {new Intl.NumberFormat(numberLocale).format(stat.value)}
              </span>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}
