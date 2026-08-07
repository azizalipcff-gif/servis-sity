import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/translations";
import { getPlans } from "@/lib/billing/plans";
import { PricingGrid } from "@/components/billing/pricing-grid";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const t = await getTranslations("pricing");
  const plans = await getPlans();

  return (
    <div className="container-site py-14">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="mt-12">
        <PricingGrid plans={plans} />
      </div>
    </div>
  );
}