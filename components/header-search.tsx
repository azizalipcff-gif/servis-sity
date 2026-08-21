"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

export function HeaderSearch() {
  const t = useTranslations("nav");
  const tH = useTranslations("hero");
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");

  // The /search page and the homepage each own their search input —
  // avoid a duplicated bar (homepage has the inline Hero search).
  if (pathname.endsWith("/search") || pathname === "/") return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  return (
    <form
      onSubmit={submit}
      className="flex h-10 w-full max-w-2xl items-center overflow-hidden rounded-lg border border-border bg-card shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20"
      role="search"
    >
      <span className="grid w-10 shrink-0 place-items-center text-muted-foreground">
        <Search className="size-[18px]" />
      </span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        placeholder={tH("marketSearchPlaceholder")}
        aria-label={tH("marketSearchPlaceholder")}
        className="h-full flex-1 border-none bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/60 [&::-webkit-search-cancel-button]:hidden"
      />
      <button
        type="submit"
        aria-label={t("search")}
        className="inline-flex h-full shrink-0 items-center gap-1.5 bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 md:px-6"
      >
        {t("search")}
      </button>
    </form>
  );
}