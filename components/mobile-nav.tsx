"use client";

import {
  Home,
  LayoutGrid,
  Heart,
  MessageSquare,
  User,
  Search,
  Store,
  LogIn,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type MobileNavProps = {
  user: { id: string } | null;
  items: { href: string; label: string }[];
  cta: { href: string; label: string };
};

export function MobileNav({ user, cta }: MobileNavProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  if (pathname.startsWith("/business/")) return null;

  const tabs = user
    ? [
        { href: "/", label: t("home"), icon: Home, match: pathname === "/" },
        {
          href: "/search",
          label: t("categories"),
          icon: LayoutGrid,
          match: pathname.startsWith("/search") || pathname.startsWith("/category/"),
        },
        {
          href: "/profile/favorites",
          label: t("favorites"),
          icon: Heart,
          match: pathname.startsWith("/profile/favorites"),
        },
        {
          href: "/messenger",
          label: t("messenger"),
          icon: MessageSquare,
          match: pathname.startsWith("/messenger"),
        },
        {
          href: "/profile",
          label: t("profile"),
          icon: User,
          match: pathname.startsWith("/profile"),
        },
      ]
    : [
        { href: "/", label: t("home"), icon: Home, match: pathname === "/" },
        {
          href: "/search",
          label: t("categories"),
          icon: LayoutGrid,
          match: pathname.startsWith("/search") || pathname.startsWith("/category/"),
        },
        {
          href: "/search",
          label: t("search"),
          icon: Search,
          match: pathname.startsWith("/search"),
        },
        {
          href: "/pricing",
          label: t("pricing"),
          icon: Store,
          match: pathname.startsWith("/pricing"),
        },
        { href: cta.href, label: t("login"), icon: LogIn, match: false },
      ];

  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden"
    >
      <div
        className="flex h-[68px] max-w-lg items-stretch justify-around px-2 md:mx-auto md:px-4"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href + tab.label}
              href={tab.href}
              aria-current={tab.match ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                tab.match
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-lg transition-colors",
                  tab.match && "bg-primary/10 text-primary",
                )}
              >
                <Icon className="size-[22px]" strokeWidth={tab.match ? 2.2 : 1.8} />
              </span>
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}