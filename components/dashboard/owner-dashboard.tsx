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
import { AnalyticsPanel } from "./analytics-panel";
import { BookingsManager } from "./bookings-manager";
import { ReviewsManager } from "./reviews-manager";
import { GalleryManager } from "./gallery-manager";
import { PlanPanel, VerificationPanel } from "./plan-panels";

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
  analytics,
  bookings,
  servicesEditor,
  businessEditor,
  productsEditor,
}: {
  business: BusinessDetail;
  analytics: Parameters<typeof AnalyticsPanel>[0]["analytics"];
  bookings: BookingRow[];
  servicesEditor: React.ReactNode;
  businessEditor: React.ReactNode;
  productsEditor?: React.ReactNode;
}) {
  const t = useTranslations("dashboard.dash");
  const [tab, setTab] = useState("analytics");

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

  return (
    <div className="space-y-6">
      <div className="flex gap-1.5 overflow-x-auto border-b border-border pb-px">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-t-xl border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "analytics" && <AnalyticsPanel analytics={analytics} />}
      {tab === "bookings" && <BookingsManager bookings={bookings} />}
      {tab === "reviews" && <ReviewsManager reviews={business.reviews} />}
      {tab === "gallery" && <GalleryManager business={business} />}
      {tab === "services" && servicesEditor}
      {tab === "products" && productsEditor}
      {tab === "plan" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <PlanPanel plan={business.plan} />
          {businessEditor}
        </div>
      )}
      {tab === "verification" && (
        <VerificationPanel
          status={business.verification_status}
          verified={business.verified}
        />
      )}
    </div>
  );
}