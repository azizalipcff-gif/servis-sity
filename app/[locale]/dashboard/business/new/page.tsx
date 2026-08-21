import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/supabase/user";
import { getCategories, getCities, getMyBusiness } from "@/lib/queries";
import { BusinessForm } from "@/components/dashboard/business-form";
import { EntityPageHeader } from "@/components/dashboard/entity-page-header";
import type { Locale } from "@/lib/translations";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function BusinessNewPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) return null;

  const [categories, cities, business, t] = await Promise.all([
    getCategories(),
    getCities(),
    getMyBusiness(user.id),
    getTranslations("dashboard"),
  ]);

  if (business) {
    return redirect({
      href: "/dashboard/business/edit",
      locale: locale as "ar" | "fr" | "en",
    });
  }

  return (
    <div className="space-y-8">
      <EntityPageHeader
        backHref="/dashboard"
        backLabel={t("wizard.backDashboard")}
        title={t("wizard.businessNewTitle")}
        description={t("wizard.businessNewDesc")}
      />
      <BusinessForm
        business={null}
        categories={categories}
        cities={cities}
        userId={user.id}
        locale={locale as Locale}
        successHref="/dashboard"
      />
    </div>
  );
}