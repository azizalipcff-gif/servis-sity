import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getAdminServices } from "@/lib/queries";
import type { Locale } from "@/lib/translations";
import { ServicesTable } from "@/components/admin/services-table";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminServicesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("admin");
  const services = await getAdminServices();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("services")}</h2>
      <ServicesTable services={services} locale={locale as Locale} />
    </div>
  );
}
