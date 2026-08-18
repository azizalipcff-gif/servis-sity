"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import type { CompletenessInput, DashboardTab } from "@/lib/business/completeness";
import { AnalyticsPanel } from "./analytics-panel";
import { BookingsManager } from "./bookings-manager";
import { ReviewsManager } from "./reviews-manager";
import { GalleryManager } from "./gallery-manager";
import { PlanPanel } from "./plan-panels";
import { ProfileCompletenessCard } from "./profile-completeness";
import { VerificationPanel } from "./verification-panel";

type BookingRow = {
  id: string;
  client_name: string;
  client_phone: string;
  booking_date: string;
  booking_time: string;
  status: string;
  services: { name: string } | null;
};

const KNOWN_TABS = [
  "analytics",
  "bookings",
  "reviews",
  "gallery",
  "services",
  "products",
  "plan",
  "verification",
] as const;

export function OwnerDashboard({
  business,
  userId,
  analytics,
  bookings,
  servicesEditor,
  businessEditor,
  productsEditor,
  initialTab,
}: {
  business: BusinessDetail;
  userId: string;
  analytics: Parameters<typeof AnalyticsPanel>[0]["analytics"];
  bookings: BookingRow[];
  servicesEditor: React.ReactNode;
  businessEditor: React.ReactNode;
  productsEditor?: React.ReactNode;
  initialTab?: string;
}) {
  const t = useTranslations("dashboard.dash");
  const [tab, setTab] = useState<string>(
    initialTab && (KNOWN_TABS as readonly string[]).includes(initialTab)
      ? initialTab
      : "analytics",
  );

  const navigate = (next: DashboardTab) => setTab(next);

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

  const tabs: { key: string; label: string; icon: typeof BarChart3 }[] = [
    { key: "analytics", label: t("analytics"), icon: BarChart3 },
    { key: "bookings", label: t("bookings"), icon: CalendarCheck },
    { key: "reviews", label: t("reviews"), icon: MessageSquareQuote },
    { key: "gallery", label: t("gallery"), icon: GalleryHorizontal },
    { key: "services", label: t("services"), icon: Wrench },
    { key: "products", label: t("products"), icon: ShoppingBag },
    { key: "plan", label: t("plan"), icon: Gem },
    { key: "verification", label: t("verification"), icon: ShieldCheck },
  ];

  const panels: Record<string, React.ReactNode> = {
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
              onClick={() => setTab(item.key)}
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