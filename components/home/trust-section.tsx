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
  const demoNotice =
    locale === "ar"
      ? "بعض القوائم والتقييمات والمنتجات المعروضة هنا بيانات تجريبية."
      : locale === "fr"
        ? "Certaines annonces, avis et produits affichés ici sont des données de démonstration."
        : "Some listings, reviews and products shown here are sample data.";
  const businessLabel =
    locale === "ar"
      ? `${businessCount} أنشطة تجريبية`
      : locale === "fr"
        ? `${businessCount} activités de démonstration`
        : `${businessCount} sample businesses`;
  const cityLabel =
    locale === "ar"
      ? `${cityCount} مدن ممثلة`
      : locale === "fr"
        ? `${cityCount} villes représentées`
        : `${cityCount} cities represented`;

  const stats = [
    { label: businessLabel, value: businessCount },
    { label: cityLabel, value: cityCount },
  ];

  return (
    <section className="container-wide pb-4" aria-labelledby="trust-section-title">
      <FadeIn>
        <div className="mb-4 text-center">
          <h2 id="trust-section-title" className="text-lg font-semibold">{t("title")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{demoNotice}</p>
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
