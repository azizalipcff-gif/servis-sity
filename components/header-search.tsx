"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { SearchInput } from "@/components/search/search-input";

const SEARCH_TYPES = [
  { value: "all", key: "typeAll" },
  { value: "business", key: "typeBusiness" },
  { value: "service", key: "typeService" },
  { value: "product", key: "typeProduct" },
] as const;

export function HeaderSearch() {
  const t = useTranslations("nav");
  const tH = useTranslations("hero");
  const tS = useTranslations("search");
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");

  const segs = pathname.split("/").filter(Boolean);
  const restPath =
    segs.length > 0 && (routing.locales as readonly string[]).includes(segs[0])
      ? "/" + segs.slice(1).join("/")
      : pathname;

  const HIDE_ON = ["/businesses", "/services", "/products"];
  if (
    pathname.endsWith("/search") ||
    HIDE_ON.includes(pathname) ||
    HIDE_ON.includes(restPath)
  )
    return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    const trimmed = q.trim();
    if (trimmed) params.set("q", trimmed);
    if (type !== "all") params.set("type", type);
    const query = params.toString();
    router.push(query ? `/search?${query}` : "/search");
  }

  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      <label className="sr-only" htmlFor="header-search-type">
        {tS("typeAll")}
      </label>
      <select
        id="header-search-type"
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="h-10 shrink-0 rounded-xl border border-border bg-background px-2.5 text-sm font-medium text-foreground outline-none transition focus:ring-2 focus:ring-primary/30 sm:px-3"
        aria-label={tS("typeAll")}
      >
        {SEARCH_TYPES.map((item) => (
          <option key={item.value} value={item.value}>
            {tS(item.key)}
          </option>
        ))}
      </select>
      <div className="min-w-0 flex-1">
        <SearchInput
          size="md"
          value={q}
          onChange={setQ}
          onSubmit={submit}
          placeholder={tH("marketSearchPlaceholder")}
          buttonLabel={t("search")}
        />
      </div>
    </div>
  );
}