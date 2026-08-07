"use client";

type Label = (key: string) => string;

export function formatListTime(iso: string, t: Label): string {
  const d = new Date(iso);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 86400000;
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (d.getTime() > start) return time;
  if (d.getTime() > start - dayMs) return t("yesterday");
  return d.toLocaleDateString();
}

export function formatDayLabel(iso: string, t: Label): string {
  const d = new Date(iso);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 86400000;
  if (d.getTime() > start) return t("today");
  if (d.getTime() > start - dayMs) return t("yesterday");
  return d.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}