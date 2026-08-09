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
import { FollowButton } from "@/components/follow-button";

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
              "group relative inline-flex h-11 items-center justify-center gap-2 px-4 font-medium transition-colors",
              a.enabled
                ? "border border-foreground text-foreground hover:bg-foreground hover:text-background"
                : "cursor-not-allowed border border-transparent bg-muted text-muted-foreground",
              a.key === "call" &&
                "border-foreground bg-foreground text-background hover:border-primary hover:bg-primary hover:text-primary-foreground",
              a.key === "whatsapp" &&
                "border-[#128C7E] bg-transparent text-[#128C7E] hover:bg-[#128C7E] hover:text-white",
            )}
          >
{inner}
        </motion.a>
      );
    })}
      <FollowButton targetType="business" targetId={business.id} />
    </motion.div>
  );
}