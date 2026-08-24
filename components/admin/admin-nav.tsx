"use client";

import { useTranslations } from "next-intl";
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Flag,
  LayoutDashboard,
  MapPin,
  Package,
  Scissors,
  Tags,
  UserRound,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PendingCounts = {
  businesses: number;
  services: number;
  products: number;
};

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  pending?: number;
};

export function AdminNav({ pendingCounts }: { pendingCounts?: PendingCounts }) {
  const t = useTranslations("admin");
  const pathname = usePathname();

  const header =
    "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

  const pendingFor = (key: keyof PendingCounts) => pendingCounts?.[key] ?? 0;

  const sections: { label: string; items: NavItem[] }[] = [
    {
      label: t("overview"),
      items: [
        { href: "/mvkbazizalimvkbadmen", label: t("dashboard"), icon: LayoutDashboard, exact: true },
        { href: "/mvkbazizalimvkbadmen/analytics", label: t("analytics"), icon: BarChart3 },
        { href: "/mvkbazizalimvkbadmen/bookings", label: t("bookings"), icon: CalendarDays },
      ],
    },
    {
      label: t("title"),
      items: [
        {
          href: "/mvkbazizalimvkbadmen/businesses",
          label: t("businesses"),
          icon: Building2,
          pending: pendingFor("businesses"),
        },
        {
          href: "/mvkbazizalimvkbadmen/services",
          label: t("services"),
          icon: Scissors,
          pending: pendingFor("services"),
        },
        {
          href: "/mvkbazizalimvkbadmen/products",
          label: t("products"),
          icon: Package,
          pending: pendingFor("products"),
        },
        { href: "/mvkbazizalimvkbadmen/billing", label: t("billing"), icon: CreditCard },
        { href: "/mvkbazizalimvkbadmen/users", label: t("users"), icon: UserRound },
        { href: "/mvkbazizalimvkbadmen/categories", label: t("categories"), icon: Tags },
        { href: "/mvkbazizalimvkbadmen/cities", label: t("cities"), icon: MapPin },
        { href: "/mvkbazizalimvkbadmen/reports", label: t("reports"), icon: Flag },
        { href: "/mvkbazizalimvkbadmen/audit", label: t("audit"), icon: Activity },
      ],
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border pb-4">
      {sections.map((section, i) => (
        <div key={section.label} className="flex flex-wrap items-center gap-1">
          {i > 0 && (
            <ChevronRight className="me-3 size-4 text-muted-foreground/40 rtl:rotate-180" />
          )}
          <span className={cn("me-2", header)}>{section.label}</span>
          {section.items.map((item) => {
            const active = item.exact
              ? pathname === "/mvkbazizalimvkbadmen"
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            const pending = item.pending ?? 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                    : "text-foreground/75 hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
                {pending > 0 && (
                  <span className="ms-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[11px] font-semibold text-amber-950">
                    {pending}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
