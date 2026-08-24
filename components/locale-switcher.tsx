"use client";

import { Check, ChevronDown, Globe } from "lucide-react";
import { useLocale } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { LOCALES } from "@/lib/translations";

const LOCALE_LABELS: Record<(typeof LOCALES)[number], string> = {
  ar: "العربية",
  fr: "Français",
  en: "English",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild id="locale-switcher-trigger">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          aria-label="Switch language"
        >
          <Globe className="size-4" />
          <span className="hidden sm:inline">
            {LOCALE_LABELS[locale as (typeof LOCALES)[number]]}
          </span>
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[10rem]"
        aria-labelledby="locale-switcher-trigger"
      >
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l} asChild>
            <Link
              href={pathname}
              locale={l}
              className="flex w-full items-center justify-between"
            >
              {LOCALE_LABELS[l]}
              {l === locale && <Check className="size-4" />}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
