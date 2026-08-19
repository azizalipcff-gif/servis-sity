"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  BarChart3,
  CalendarCheck,
  GalleryHorizontal,
  Gem,
  MessageSquareQuote,
  ShieldCheck,
  ShoppingBag,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusinessDetail } from "@/lib/queries";
import {
  DASHBOARD_TABS,
  type CompletenessInput,
  type DashboardTab,
} from "@/lib/business/completeness";
import { AnalyticsPanel } from "./analytics-panel";
import { BookingsManager } from "./bookings-manager";
import { ReviewsManager } from "./reviews-manager";
import { GalleryManager } from "./gallery-manager";
import { PlanPanel } from "./plan-panels";
import { ProfileCompletenessCard } from "./profile-completeness";
import { VerificationPanel } from "./verification-panel";
import { BusinessHoursEditor } from "./business-hours-editor";

type BookingRow = {
  id: string;
  client_name: string;
  client_phone: string;
  booking_date: string;
  booking_time: string;
  status: string;
  services: { name: string } | null;
};

export function OwnerDashboard({
  business,
  userId,
  analytics,
  bookings,
  servicesEditor,
  businessEditor,
  productsEditor,
}: {
  business: BusinessDetail;
  userId: string;
  analytics: Parameters<typeof AnalyticsPanel>[0]["analytics"];
  bookings: BookingRow[];
  servicesEditor: React.ReactNode;
  businessEditor: React.ReactNode;
  productsEditor?: React.ReactNode;
}) {
  const t = useTranslations("dashboard.dash");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // The URL is the single source of truth for the active section. Deriving the
  // tab directly from `?tab=` (instead of duplicating it in local state) keeps
  // the URL and the rendered panel in lockstep for direct links, refresh,
  // Back/Forward and client-side navigation alike. Invalid or absent values
  // fall back deterministically to Analytics.
  const urlTab = searchParams.get("tab");
  const tab: DashboardTab =
    (DASHBOARD_TABS as readonly string[]).includes(urlTab ?? "")
      ? (urlTab as DashboardTab)
      : "analytics";

  /** Switch section and persist `?tab=...` so the URL always reflects the panel. */
  const selectTab = (key: DashboardTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", key);
    router.push(`${pathname}?${params.toString()}`);
  };

  const navigate = selectTab;

  const completeness: CompletenessInput = {
    description: business.description,
    logo_url: business.logo_url,
    cover_url: business.cover_url,
    phone: business.phone,
    whatsapp: business.whatsapp,
    address: business.address,
    city_id: business.city_id,
    verification_status: business.verification_status,
    servicesCount: business.services?.length ?? 0,
    hoursCount: business.hours?.length ?? 0,
  };

  const tabs: { key: DashboardTab; label: string; icon: typeof BarChart3 }[] = [
    { key: "analytics", label: t("analytics"), icon: BarChart3 },
    { key: "bookings", label: t("bookings"), icon: CalendarCheck },
    { key: "reviews", label: t("reviews"), icon: MessageSquareQuote },
    { key: "gallery", label: t("gallery"), icon: GalleryHorizontal },
    { key: "services", label: t("services"), icon: Wrench },
    { key: "products", label: t("products"), icon: ShoppingBag },
    { key: "plan", label: t("plan"), icon: Gem },
    { key: "verification", label: t("verification"), icon: ShieldCheck },
  ];

  const panels: Record<DashboardTab, React.ReactNode> = {
    analytics: <AnalyticsPanel analytics={analytics} bookingsCount={bookings.length} />,
    bookings: <BookingsManager bookings={bookings} business={business} />,
    reviews: <ReviewsManager reviews={business.reviews} />,
    gallery: <GalleryManager business={business} />,
    services: servicesEditor,
    products: productsEditor,
    plan: (
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <PlanPanel plan={business.plan} />
          <ProfileCompletenessCard data={completeness} onNavigate={navigate} />
          <BusinessHoursEditor business={business} />
        </div>
        {businessEditor}
      </div>
    ),
    verification: (
      <VerificationPanel
        businessId={business.id}
        userId={userId}
        verificationStatus={business.verification_status}
      />
    ),
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-1 overflow-x-auto rounded-2xl border bg-card p-1">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => selectTab(item.key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {panels[tab]}
    </div>
  );
}