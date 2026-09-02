import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getAdminBusinesses } from "@/lib/admin-queries";
import type { Locale } from "@/lib/translations";
import { BusinessesTable } from "@/components/admin/businesses-table";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminBusinessesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const businesses = await getAdminBusinesses();
  return <div className="space-y-4"><h2 className="text-lg font-semibold">{t("businesses")}</h2><BusinessesTable businesses={businesses} locale={locale as Locale} /></div>;
}
