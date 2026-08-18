import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getCurrentUser, getCurrentProfile } from "@/lib/supabase/user";
import {
  getCategories,
  getMyBusiness,
  getOwnerAnalytics,
  getBookingsForOwner,
  getProductsForBusiness,
} from "@/lib/queries";
import type { Locale } from "@/lib/translations";
import { BusinessForm } from "@/components/dashboard/business-form";
import { ServicesManager } from "@/components/dashboard/services-manager";
import { ProductsManager } from "@/components/dashboard/products-manager";
import { OwnerDashboard } from "@/components/dashboard/owner-dashboard";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
};

export default async function DashboardPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { tab } = await searchParams;

  const user = await getCurrentUser();

  const [profile, categories, business] = await Promise.all([
    getCurrentProfile(),
    getCategories(),
    getMyBusiness(user?.id ?? ""),
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
        </div>
        <BusinessForm
          business={null}
          categories={categories}
          userId={user?.id ?? ""}
          locale={locale as Locale}
        />
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

      <OwnerDashboard
        business={business}
        userId={user?.id ?? ""}
        analytics={analytics}
        bookings={bookings}
        initialTab={typeof tab === "string" ? tab : undefined}
        servicesEditor={
          <ServicesManager business={business} categories={categories} ownerId={user?.id ?? ""} />
        }
        productsEditor={
          <ProductsManager
            businessId={business.id}
            ownerId={business.owner_id}
            initial={products}
          />
        }
        businessEditor={
          <BusinessForm
            business={business}
            categories={categories}
            userId={user?.id ?? ""}
            locale={locale as Locale}
          />
        }
      />
    </div>
  );
}