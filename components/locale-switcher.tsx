"use client";

import { Check, ChevronDown, Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { useId, useEffect, useState } from "react";
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

const LOCALE_CODES: Record<(typeof LOCALES)[number], string> = {
  ar: "AR",
  fr: "FR",
  en: "EN",
};

/**
 * EN/FR/AR switcher. Reused by both the desktop bar and the mobile bottom
 * navigation. `mobile` only changes the trigger presentation (icon + short
 * code, matching the rest of the mobile nav) — the dropdown and desktop
 * behavior are untouched.
 *
 * The trigger id is generated per instance via useId() so the desktop and
 * mobile instances don't collide on the same DOM id.
 *
 * The current search query is preserved when switching locale (e.g.
 * /en/search?q=plombier -> /fr/search?q=plombier). It's read post-hydration
 * to avoid a useSearchParams() Suspense boundary during static rendering.
 */
export function LocaleSwitcher({ mobile = false }: { mobile?: boolean }) {
  const locale = useLocale();
  const pathname = usePathname();
  const id = useId();
  const [query, setQuery] = useState("");

  useEffect(() => {
    setQuery(window.location.search);
  }, []);

  const href = query ? `${pathname}${query}` : pathname;

  const trigger = mobile ? (
    <Button
      variant="ghost"
      size="sm"
      id={id}
      aria-label="Switch language"
      className="flex h-auto flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1"
    >
      <span className="grid size-9 place-items-center rounded-lg transition-colors">
        <Globe className="size-[22px]" />
      </span>
      <span className="text-[10px] font-medium leading-none">
        {LOCALE_CODES[locale as (typeof LOCALES)[number]] ?? locale.toUpperCase()}
      </span>
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="sm"
      id={id}
      aria-label="Switch language"
      className="gap-1.5"
    >
      <Globe className="size-4" />
      <span className="hidden sm:inline">
        {LOCALE_LABELS[locale as (typeof LOCALES)[number]]}
      </span>
      <ChevronDown className="size-3.5 opacity-60" />
    </Button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        side={mobile ? "top" : "bottom"}
        align="end"
        className="min-w-[10rem]"
        aria-labelledby={id}
      >
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l} asChild>
            <Link
              href={href}
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
