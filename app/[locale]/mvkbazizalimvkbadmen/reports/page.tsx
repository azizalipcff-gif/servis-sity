import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getAdminReports } from "@/lib/queries";
import type { Locale } from "@/lib/translations";
import { ReportsManager } from "@/components/admin/reports-manager";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminReportsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("admin");
  const reports = await getAdminReports();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("reports")}</h2>
      <ReportsManager reports={reports} locale={locale as Locale} />
    </div>
  );
}