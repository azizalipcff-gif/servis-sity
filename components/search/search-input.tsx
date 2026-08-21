"use client";

import type { FormEvent } from "react";
import { Search } from "lucide-react";

export function SearchInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  buttonLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  placeholder?: string;
  buttonLabel?: string;
}) {
  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className="flex h-12 w-full items-center overflow-hidden rounded-xl border border-border bg-card shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20"
    >
      <span className="grid w-12 shrink-0 place-items-center text-muted-foreground">
        <Search className="size-5" />
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="search"
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-full min-w-0 flex-1 border-none bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/60 [&::-webkit-search-cancel-button]:hidden"
      />
      <button
        type="submit"
        className="inline-flex h-full shrink-0 items-center gap-1.5 bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 md:px-7"
      >
        {buttonLabel}
      </button>
    </form>
  );
}