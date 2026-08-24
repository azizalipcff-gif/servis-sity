import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getAdminProducts } from "@/lib/queries";
import type { Locale } from "@/lib/translations";
import { ProductsTable } from "@/components/admin/products-table";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminProductsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("admin");
  const products = await getAdminProducts();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("products")}</h2>
      <ProductsTable products={products} locale={locale as Locale} />
    </div>
  );
}
