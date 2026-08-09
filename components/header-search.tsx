"use client";

import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { MOROCCAN_CITIES } from "@/lib/constants";

export function HeaderSearch() {
  const t = useTranslations("nav");
  const tH = useTranslations("hero");
  const router = useRouter();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    const trimmed = q.trim();
    if (trimmed) params.set("q", trimmed);
    if (city) params.set("city", city);
    router.push(`/search?${params.toString()}`);
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
<SelectCity
        value={city}
        onChange={setCity}
        allLabel={tH("allCities")}
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

function SelectCity({
  value,
  onChange,
  allLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative hidden h-full items-center border-s border-border px-3 md:flex">
      <MapPin className="size-4 shrink-0 text-muted-foreground" />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="line-clamp-1 max-w-[120px] px-1 text-start text-[13px] font-medium text-foreground/80"
      >
        {value || allLabel}
      </button>
      {open && (
        <ul className="absolute end-0 top-full z-50 mt-1 max-h-64 w-44 overflow-y-auto border border-border bg-popover text-popover-foreground shadow-soft">
          {[allLabel, ...MOROCCAN_CITIES].map((c) => (
            <li key={c}>
              <button
                type="button"
                onMouseDown={() => {
                  onChange(c === allLabel ? "" : c);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-muted"
              >
                <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="line-clamp-1">{c}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}