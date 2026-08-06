"use client";

import { motion } from "framer-motion";
import {
  Bookmark,
  MessageCircle,
  Navigation,
  Phone,
  Share,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { BusinessDetail } from "@/lib/queries";

type Action = {
  key: string;
  label: string;
  icon: typeof Phone;
  enabled: boolean;
  href?: string;
  external?: boolean;
  onClick?: () => void;
};

export function QuickActions({
  business,
  locale,
}: {
  business: BusinessDetail;
  locale: string;
}) {
  const t = useTranslations("business");
  const dt = useTranslations("business.detail");

  const waNumber = business.whatsapp?.replace(/\D/g, "");
  const directionsHref = (() => {
    if (business.lat && business.lng)
      return `https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lng}`;
    if (business.address)
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`;
    return undefined;
  })();

  const savedKey = `sv-saved-${business.id}`;
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try {
      setSaved(localStorage.getItem(savedKey) === "1");
    } catch {
      setSaved(false);
    }
  }, [savedKey]);

  async function onShare() {
    const url = `${window.location.origin}/${locale}/business/${business.slug}`;
    const data = { title: business.name, url };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* user cancelled */
    }
  }

  function toggleSave() {
    const next = !saved;
    setSaved(next);
    try {
      localStorage.setItem(savedKey, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  const actions: Action[] = [
    {
      key: "call",
      label: t("call"),
      icon: Phone,
      enabled: Boolean(business.phone),
      href: business.phone ? `tel:${business.phone}` : undefined,
      external: false,
    },
    {
      key: "whatsapp",
      label: t("whatsapp"),
      icon: MessageCircle,
      enabled: Boolean(waNumber),
      href: waNumber ? `https://wa.me/${waNumber}` : undefined,
      external: true,
    },
    {
      key: "directions",
      label: t("directions"),
      icon: Navigation,
      enabled: Boolean(directionsHref),
      href: directionsHref,
      external: true,
    },
    {
      key: "save",
      label: saved ? dt("saved") : dt("save"),
      icon: Bookmark,
      enabled: true,
      onClick: toggleSave,
    },
{
      key: "share",
      label: dt("share"),
      icon: Share,
      enabled: true,
      onClick: onShare,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
      className="flex flex-wrap items-center gap-2"
      style={{ direction: locale === "ar" ? "rtl" : "ltr" }}
    >
      {actions.map((a, i) => {
        const Icon = a.icon;
        const inner = (
          <>
            <Icon
              className={cn(
                "size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110",
                saved && a.key === "save" && "fill-primary text-primary",
              )}
            />
            {a.key !== "call" && a.key !== "whatsapp" && (
              <span className="hidden text-xs font-medium sm:inline">
                {a.label}
              </span>
            )}
          </>
        );
        return (
          <motion.a
            key={a.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 + i * 0.05 }}
            href={a.enabled ? a.href : undefined}
            onClick={(e) => {
              if (!a.enabled) {
                e.preventDefault();
                return;
              }
              if (a.onClick) {
                e.preventDefault();
                a.onClick();
              }
              window.dispatchEvent(
                new CustomEvent("tt:lead", {
                  detail: { type: a.key },
                }),
              );
            }}
            target={a.external ? "_blank" : undefined}
            rel={a.external ? "noopener noreferrer" : undefined}
            aria-label={a.label}
            title={a.label}
            className={cn(
              "group relative inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 font-medium shadow-sm ring-1 ring-transparent transition-all duration-300",
              a.enabled
                ? "bg-card ring-border hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/30"
                : "cursor-not-allowed bg-muted/40 text-muted-foreground",
              a.key === "call" &&
                "bg-primary text-primary-foreground hover:shadow-primary/20",
              a.key === "whatsapp" &&
                "bg-accent text-accent-foreground hover:shadow-accent/20",
            )}
          >
{inner}
        </motion.a>
      );
    })}
    </motion.div>
  );
}