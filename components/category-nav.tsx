"use client";

import { ChevronDown, Package, Store, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { getCategoryIcon } from "@/components/category-icon";
import { localizedName, type Locale } from "@/lib/translations";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/supabase/database.types";

const MAX_VISIBLE = 9;

export function CategoryNav({ categories }: { categories: Category[] }) {
  const t = useTranslations("categories");
  const navt = useTranslations("nav");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const [searchCategory, setSearchCategory] = useState<string | null>(null);

  useEffect(() => {
    if (pathname !== "/search") return;
    setSearchCategory(new URLSearchParams(window.location.search).get("category"));
  }, [pathname]);

  if (categories.length === 0) return null;

  const visible = categories.slice(0, MAX_VISIBLE);
  const rest = categories.slice(MAX_VISIBLE);

  const typeLinks = [
    { href: "/business", label: navt("businesses"), icon: Store },
    { href: "/services", label: navt("services"), icon: Wrench },
    { href: "/products", label: navt("products"), icon: Package },
  ];

  return (
    <div className="border-b border-border bg-background">
      <div className="container-site flex items-stretch gap-1 overflow-x-auto scrollbar-none">
        {typeLinks.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className={cn("size-4", active && "text-primary")} />
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}

        <span aria-hidden className="my-2 w-px shrink-0 bg-border" />

        {visible.map((c) => {
          const Icon = getCategoryIcon(c.icon);
          const href = `/category/${c.slug}`;
          const active =
            pathname === href ||
            (pathname === "/search" && searchCategory === c.slug);
          return (
            <Link
              key={c.id}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className={cn("size-4", active && "text-primary")} />
              <span className="whitespace-nowrap">{localizedName(c, locale)}</span>
            </Link>
          );
        })}

        <Link
          href="/search"
          className="flex shrink-0 items-center gap-1 px-3 py-2 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/5"
        >
          {t("more")}
          {rest.length > 0 && <ChevronDown className="size-3.5" />}
        </Link>
      </div>
    </div>
  );
}