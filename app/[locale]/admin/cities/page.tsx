import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getCities } from "@/lib/queries";
import type { Locale } from "@/lib/translations";
import { CitiesManager } from "@/components/admin/cities-manager";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminCitiesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("admin");
  const cities = await getCities();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("cities")}</h2>
      <CitiesManager cities={cities} locale={locale as Locale} />
    </div>
  );
}