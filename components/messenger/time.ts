"use client";

type Label = (key: string) => string;

/**
 * All formatters take an explicit locale. The previous browser-default
 * `toLocaleTimeString([])` calls produced different text on server and
 * client (hydration mismatch) because the RSC pass has no browser locale.
 */

export function formatListTime(iso: string, t: Label, locale: string): string {
  const d = new Date(iso);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 86400000;
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);
  if (d.getTime() > start) return time;
  if (d.getTime() > start - dayMs) return t("yesterday");
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d);
}

export function formatDayLabel(iso: string, t: Label, locale: string): string {
  const d = new Date(iso);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 86400000;
  if (d.getTime() > start) return t("today");
  if (d.getTime() > start - dayMs) return t("yesterday");
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}
