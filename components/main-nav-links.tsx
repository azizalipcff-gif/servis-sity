"use client";

import { Package, Store, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/business", labelKey: "businesses", icon: Store },
  { href: "/services", labelKey: "services", icon: Wrench },
  { href: "/products", labelKey: "products", icon: Package },
];

export function MainNavLinks() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 xl:flex" aria-label="Main">
      {LINKS.map(({ href, labelKey, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className={cn("size-4", active && "text-primary")} />
            <span className="whitespace-nowrap">{t(labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
