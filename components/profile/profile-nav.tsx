"use client";

import { useTranslations } from "next-intl";
import {
  Building2,
  Heart,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

export function ProfileNav({ role }: { role: string | null | undefined }) {
  const t = useTranslations("workspace");
  const pathname = usePathname();

  const canPublic = role === "owner" || role === "admin";

  const items: NavItem[] = [
    {
      href: "/profile",
      label: t("nav.overview"),
      icon: LayoutDashboard,
    },
    ...(canPublic
      ? ([
          { href: "/profile/business", label: t("nav.business"), icon: Building2 },
          { href: "/profile/services", label: t("nav.services"), icon: Wrench },
          { href: "/profile/products", label: t("nav.products"), icon: Package },
        ] satisfies NavItem[])
      : []),
    { href: "/messenger", label: t("nav.messages"), icon: MessageSquare },
    { href: "/profile/favorites", label: t("nav.favorites"), icon: Heart },
    { href: "/profile/settings", label: t("nav.settings"), icon: Settings },
  ];

  return (
    <nav
      aria-label={t("name")}
      className="scrollbar-none -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0"
    >
      <div className="flex items-center gap-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/profile"
              ? pathname === "/profile"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition-all duration-200 sm:px-4",
                active
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}