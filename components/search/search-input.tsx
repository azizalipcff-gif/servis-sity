"use client";

import type { FormEvent } from "react";
import { Search } from "lucide-react";

export function SearchInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  buttonLabel,
  size = "lg",
  inputClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  placeholder?: string;
  buttonLabel?: string;
  /** "lg" fills the page hero; "md" is the compact header bar. */
  size?: "md" | "lg";
  inputClassName?: string;
}) {
  const height = size === "md" ? "h-11" : "h-12";
  const iconBox = size === "md" ? "w-11" : "w-12";
  const iconSize = size === "md" ? "size-[18px]" : "size-5";
  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className={`flex ${height} w-full min-w-0 items-center overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20`}
    >
      <span className={`grid ${iconBox} shrink-0 place-items-center text-muted-foreground`}>
        <Search className={iconSize} aria-hidden="true" />
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="search"
        placeholder={placeholder}
        aria-label={placeholder}
        className={
          inputClassName ??
          "h-full min-w-0 flex-1 border-none bg-transparent px-1 text-[15px] text-foreground outline-none placeholder:text-muted-foreground/60 [&::-webkit-search-cancel-button]:hidden"
        }
      />
      <button
        type="submit"
        className="inline-flex h-full shrink-0 items-center gap-1.5 bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:px-5 md:px-6"
      >
        {buttonLabel}
      </button>
    </form>
  );
}
