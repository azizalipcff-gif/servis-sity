"use client";

import { ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { getCategoryIcon } from "@/components/category-icon";
import { localizedName, type Locale } from "@/lib/translations";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/supabase/database.types";

const MAX_VISIBLE = 9;

export function CategoryNav({ categories }: { categories: Category[] }) {
  const t = useTranslations("categories");
  const locale = useLocale() as Locale;
  const pathname = usePathname();

  if (categories.length === 0) return null;

  const visible = categories.slice(0, MAX_VISIBLE);
  const rest = categories.slice(MAX_VISIBLE);

  return (
    <div className="border-b border-border bg-background">
      <div className="container-site flex items-stretch gap-1 overflow-x-auto scrollbar-none">
        {visible.map((c) => {
          const Icon = getCategoryIcon(c.icon);
          const href = `/category/${c.slug}`;
          const active =
            pathname === href ||
            (pathname === "/search" &&
              new URLSearchParams(
                typeof window !== "undefined" ? window.location.search : "",
              ).get("category") === c.slug);
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