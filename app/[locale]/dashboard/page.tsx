import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getCurrentUser, getCurrentProfile } from "@/lib/supabase/user";
import {
  getCategories,
  getMyBusiness,
  getBookingsForOwner,
  getProductsForBusiness,
} from "@/lib/queries";
import { getCities } from "@/lib/home-queries";
import { getOwnerAnalytics } from "@/lib/admin-queries";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { BusinessForm } from "@/components/dashboard/business-form";
import { ServicesManager } from "@/components/dashboard/services-manager";
import { ProductsManager } from "@/components/dashboard/products-manager";
import { OwnerDashboard } from "@/components/dashboard/owner-dashboard";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) return null;

  const [profile, categories, cities, business] = await Promise.all([
    getCurrentProfile(),
    getCategories(),
    getCities(),
    getMyBusiness(user.id),
  ]);

  const t = await getTranslations("dashboard");

  if (!business) {
    return (
      <div className="space-y-8">
        <p className="text-muted-foreground">
          {t("welcome", {
            name: profile?.full_name || user?.email?.split("@")[0] || "",
          })}
        </p>
        <div className="rounded-3xl border border-dashed border-primary/30 bg-card/40 p-10 text-center">
          <p className="text-muted-foreground">{t("noBusiness")}</p>
          <Button asChild className="mt-5">
            <Link href="/dashboard/business/new">{t("createBusiness")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const [analytics, bookings, products] = await Promise.all([
    getOwnerAnalytics(business.id),
    getBookingsForOwner(business.id),
    getProductsForBusiness(business.id),
  ]);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        {t("welcome", {
          name: profile?.full_name || user?.email?.split("@")[0] || "",
        })}
        {business.name ? ` — ${business.name}` : ""}
      </p>

      <Suspense fallback={null}>
        <OwnerDashboard
          business={business}
          userId={user.id}
          analytics={analytics}
          bookings={bookings}
          servicesEditor={<ServicesManager business={business} />}
          productsEditor={<ProductsManager businessId={business.id} initial={products} />}
          businessEditor={
            <BusinessForm
              business={business}
              categories={categories}
              cities={cities}
              userId={user.id}
              locale={locale as Locale}
            />
          }
        />
      </Suspense>
    </div>
  );
}
