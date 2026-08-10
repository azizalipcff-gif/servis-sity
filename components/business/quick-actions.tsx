"use client";

import { motion } from "framer-motion";
import {
  Bookmark,
  Loader2,
  MessageCircle,
  MessageSquare,
  Navigation,
  Phone,
  Share,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { BusinessDetail } from "@/lib/queries";
import { FollowButton } from "@/components/follow-button";
import { useBusinessChat } from "./use-business-chat";

export function QuickActions({
  business,
  locale,
}: {
  business: BusinessDetail;
  locale: string;
}) {
  const t = useTranslations("business");
  const dt = useTranslations("business.detail");
  const { startChat, busy: chatBusy, isOwner } = useBusinessChat(
    business.id,
    business.owner_id,
    business.slug,
  );

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

  type Action = {
    key: string;
    label: string;
    icon: typeof Phone;
    enabled: boolean;
    href?: string;
    external?: boolean;
    onClick?: () => void;
    busy?: boolean;
    priority: "primary" | "secondary" | "tertiary";
  };

  const actions: Action[] = [
    {
      key: "call",
      label: t("call"),
      icon: Phone,
      enabled: Boolean(business.phone),
      href: business.phone ? `tel:${business.phone}` : undefined,
      external: false,
      priority: "primary",
    },
    {
      key: "whatsapp",
      label: t("whatsapp"),
      icon: MessageCircle,
      enabled: Boolean(waNumber),
      href: waNumber ? `https://wa.me/${waNumber}` : undefined,
      external: true,
      priority: "secondary",
    },
    {
      key: "chat",
      label: t("chat"),
      icon: MessageSquare,
      enabled: !isOwner,
      busy: chatBusy,
      onClick: () => void startChat(),
      priority: "secondary",
    },
    {
      key: "directions",
      label: t("directions"),
      icon: Navigation,
      enabled: Boolean(directionsHref),
      href: directionsHref,
      external: true,
      priority: "secondary",
    },
    {
      key: "save",
      label: saved ? dt("saved") : dt("save"),
      icon: Bookmark,
      enabled: true,
      onClick: toggleSave,
      priority: "tertiary",
    },
    {
      key: "share",
      label: dt("share"),
      icon: Share,
      enabled: true,
      onClick: onShare,
      priority: "tertiary",
    },
  ];

  const actionClasses = {
    primary:
      "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
    secondary:
      "border border-border/80 bg-background text-foreground shadow-sm hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
    tertiary:
      "border border-transparent text-muted-foreground hover:bg-primary/10 hover:text-primary",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
      className="flex flex-wrap items-center gap-2"
    >
      {actions.map((a, i) => {
        const Icon = a.icon;
        const inner = (
          <>
            {a.busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Icon
                className={cn(
                  "size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110",
                  saved && a.key === "save" && "fill-primary text-primary",
                )}
              />
            )}
            <span>{a.label}</span>
          </>
        );
        const shared = cn(
          "group inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          actionClasses[a.priority],
          !a.enabled &&
            "pointer-events-none border border-border bg-muted text-muted-foreground/60",
        );
        return a.href ? (
          <motion.a
            key={a.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 + i * 0.05 }}
            href={a.enabled ? a.href : undefined}
            target={a.enabled && a.external ? "_blank" : undefined}
            rel={a.enabled && a.external ? "noopener noreferrer" : undefined}
            aria-disabled={!a.enabled}
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("tt:lead", { detail: { type: a.key } }),
              )
            }
            className={shared}
          >
            {inner}
          </motion.a>
        ) : (
          <motion.button
            key={a.key}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 + i * 0.05 }}
            onClick={() => {
              a.onClick?.();
              window.dispatchEvent(
                new CustomEvent("tt:lead", { detail: { type: a.key } }),
              );
            }}
            aria-label={a.label}
            aria-busy={a.busy || undefined}
            disabled={a.busy || undefined}
            className={shared}
          >
            {inner}
          </motion.button>
        );
      })}
      <FollowButton targetType="business" targetId={business.id} />
    </motion.div>
  );
}