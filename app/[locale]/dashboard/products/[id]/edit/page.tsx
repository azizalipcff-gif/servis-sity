import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/supabase/user";
import { getCategories, getMyBusiness, getProductsForBusiness } from "@/lib/queries";
import { ProductForm } from "@/components/dashboard/product-form";
import { EntityPageHeader } from "@/components/dashboard/entity-page-header";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function ProductEditPage({ params }: Props) {
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

  const products = await getProductsForBusiness(business.id);
  const product = products.find((p) => p.id === id);
  if (!product) notFound();

  return (
    <div className="space-y-8">
      <EntityPageHeader
        backHref="/dashboard?tab=products"
        backLabel={t("wizard.backProducts")}
        title={t("wizard.productEditTitle")}
        description={t("wizard.productEditDesc")}
      />
      <ProductForm
        businessId={business.id}
        ownerId={user.id}
        categories={categories}
        initial={product}
        successHref="/dashboard?tab=products"
      />
    </div>
  );
}