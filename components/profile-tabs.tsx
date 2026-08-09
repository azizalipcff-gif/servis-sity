"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type ProfileTabsProps = {
  tabs: { href: string; label: string }[];
};

export function ProfileTabs({ tabs }: ProfileTabsProps) {
  const pathname = usePathname();

  return (
    <div className="mb-10 flex max-w-full items-stretch gap-6 overflow-x-auto border-b border-border">
      {tabs.map((tab) => {
        const active =
          tab.href === "/profile"
            ? pathname === "/profile"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative -mb-px shrink-0 pb-3 pt-1 text-sm font-medium transition-colors",
              active
                ? "border-b-2 border-foreground text-foreground"
                : "border-b-2 border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}