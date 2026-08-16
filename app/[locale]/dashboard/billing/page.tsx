import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import type { Locale } from "@/lib/translations";
import { BillingDashboard } from "@/components/billing/billing-dashboard";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function BillingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("billing");
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
      </div>
      <Suspense fallback={null}>
        <BillingDashboard />
      </Suspense>
    </div>
  );
}