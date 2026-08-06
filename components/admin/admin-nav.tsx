"use client";

import { useTranslations } from "next-intl";
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronRight,
  Flag,
  LayoutDashboard,
  MapPin,
  Tags,
  UserRound,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function AdminNav() {
  const t = useTranslations("admin");
  const pathname = usePathname();

  const header =
    "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

  const sections = [
    {
      label: t("overview"),
      items: [
        { href: "/admin", label: t("dashboard"), icon: LayoutDashboard, exact: true },
        { href: "/admin/analytics", label: t("analytics"), icon: BarChart3 },
        { href: "/admin/bookings", label: t("bookings"), icon: CalendarDays },
      ],
    },
    {
      label: t("title"),
      items: [
        { href: "/admin/businesses", label: t("businesses"), icon: Building2 },
        { href: "/admin/users", label: t("users"), icon: UserRound },
        { href: "/admin/categories", label: t("categories"), icon: Tags },
        { href: "/admin/cities", label: t("cities"), icon: MapPin },
        { href: "/admin/reports", label: t("reports"), icon: Flag },
        { href: "/admin/audit", label: t("audit"), icon: Activity },
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
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/75 hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}