"use client";

import { useTranslations } from "next-intl";
import { MapPin, Navigation, X } from "lucide-react";
import { motion } from "framer-motion";
import type { SearchBusiness } from "@/lib/search/types";

/**
 * Interactive-map slot (architecturally ready). Swap the placeholder for a
 * Maps/Leaflet provider by keeping the same props contract. Loaded lazily via
 * `next/dynamic` so the map bundle never blocks first paint.
 */
export function MapPanel({
  businesses,
  onClose,
}: {
  businesses: SearchBusiness[];
  onClose: () => void;
}) {
  const t = useTranslations("search");
  const listed = businesses.filter((b) => b.lat != null && b.lng != null);
  const visible = businesses.length > 0 ? Math.min(businesses.length, 60) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className="sticky top-20 hidden h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-2xl border bg-card shadow-sm lg:flex"
    >
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Navigation className="size-4 text-primary" />
          {t("mapTitle")}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>

      <div
        className="relative flex-1"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--primary) 14%, transparent), color-mix(in oklab, var(--accent) 12%, transparent))",
        }}
      >
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "22px 22px", color: "var(--foreground)" }} />
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <MapPin className="size-10 text-primary/70" />
          <p className="text-sm font-semibold">{t("mapComing")}</p>
          <p className="max-w-[16rem] text-xs text-muted-foreground">
            {t("mapHint", { count: visible })}
          </p>
        </div>
      </div>

      <div className="border-t p-3">
        <p className="text-xs text-muted-foreground">
          {t("mapCount", { count: listed.length })}
        </p>
      </div>
    </motion.div>
  );
}