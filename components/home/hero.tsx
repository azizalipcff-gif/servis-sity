import { ArrowRight, Building2, MapPin, ShoppingBag, Wrench } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

type Props = {
  businessCount: number;
  cityCount: number;
  serviceCount: number;
  productCount: number;
};

export async function Hero({
  businessCount,
  cityCount,
  serviceCount,
  productCount,
}: Props) {
  const t = await getTranslations("hero");
  const locale = await getLocale();
  const numberLocale = locale === "ar" ? "ar-MA" : locale;

  const stats = [
    { value: businessCount, label: t("statBusinesses") },
    { value: cityCount, label: t("statCities") },
    { value: serviceCount, label: t("statServices") },
    { value: productCount, label: t("statProducts") },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-secondary/70 via-background to-background">
      <div
        aria-hidden
        className="pointer-events-none absolute -start-40 -top-40 size-[34rem] rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-52 -end-40 size-[38rem] rounded-full bg-accent/10 blur-3xl"
      />

      <div className="container-site relative py-12 sm:py-16 lg:py-20">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <MapPin className="size-3.5" />
            {t("eyebrow")}
          </span>

          <h1 className="mt-6 text-editorial text-4xl sm:text-5xl lg:text-[3.4rem] xl:text-6xl">
            {t("title")}
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("subtitle")}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="px-7">
              <Link href="/services">
                <Wrench className="size-4" />
                {t("ctaServices")}
                <ArrowRight className="size-4 rtl:rotate-180" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outlinePrimary" className="px-7">
              <Link href="/business">
                <Building2 className="size-4" />
                {t("ctaBusinesses")}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outlinePrimary" className="px-7">
              <Link href="/products">
                <ShoppingBag className="size-4" />
                {t("ctaProducts")}
              </Link>
            </Button>
          </div>

          <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dd className="text-editorial text-3xl text-primary sm:text-4xl">
                  {new Intl.NumberFormat(numberLocale).format(stat.value)}+
                </dd>
                <dt className="mt-1.5 text-[13px] font-medium text-muted-foreground">
                  {stat.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}