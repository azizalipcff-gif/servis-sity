import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/supabase/user";
import { getCategories, getMyBusiness } from "@/lib/queries";
import { ServiceForm } from "@/components/dashboard/service-form";
import { EntityPageHeader } from "@/components/dashboard/entity-page-header";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function ServiceEditPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) return null;

  const [categories, business, t] = await Promise.all([
    getCategories(),
    getMyBusiness(user.id),
    getTranslations("dashboard"),
  ]);

  if (!business) {
    return redirect({
      href: "/dashboard/business/new",
      locale: locale as "ar" | "fr" | "en",
    });
  }

  const service = (business.services ?? []).find((s) => s.id === id);
  if (!service) notFound();

  return (
    <div className="space-y-8">
      <EntityPageHeader
        backHref="/dashboard?tab=services"
        backLabel={t("wizard.backServices")}
        title={t("wizard.serviceEditTitle")}
        description={t("wizard.serviceEditDesc")}
      />
      <ServiceForm
        businessId={business.id}
        ownerId={user.id}
        categories={categories}
        initial={service}
        successHref="/dashboard?tab=services"
      />
    </div>
  );
}