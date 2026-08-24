import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/translations";
import { AdminBilling } from "@/components/billing/admin-billing";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminBillingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("billing");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("admin.title")}</h1>
      <AdminBilling />
    </div>
  );
}