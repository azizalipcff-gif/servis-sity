"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { SearchInput } from "@/components/search/search-input";

export function HeaderSearch() {
  const t = useTranslations("nav");
  const tH = useTranslations("hero");
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");

  // next-intl's usePathname may or may not include the locale prefix depending
  // on wiring, so strip a leading locale segment before comparing.
  const segs = pathname.split("/").filter(Boolean);
  const restPath =
    segs.length > 0 && (routing.locales as readonly string[]).includes(segs[0])
      ? "/" + segs.slice(1).join("/")
      : pathname;

  // The /search page and the listing pages (/business, /services, /products)
  // each own their own search input (with category, city, verified and sort
  // filters), so hide this global bar there to avoid a redundant second search
  // box. It stays visible everywhere else — including the homepage, where it is
  // the primary search moved up into the navigation row.
  const HIDE_ON = ["/business", "/services", "/products"];
  if (
    pathname.endsWith("/search") ||
    HIDE_ON.includes(pathname) ||
    HIDE_ON.includes(restPath)
  )
    return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  return (
    <div className="w-full min-w-0">
      <SearchInput
        size="md"
        value={q}
        onChange={setQ}
        onSubmit={submit}
        placeholder={tH("marketSearchPlaceholder")}
        buttonLabel={t("search")}
      />
    </div>
  );
}