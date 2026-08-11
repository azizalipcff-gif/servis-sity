"use client";

import { Loader2, MapPin, MessageCircle, MessageSquare, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { BusinessDetail } from "@/lib/queries";
import { useBusinessChat } from "./use-business-chat";

export function StickyActionBar({ business }: { business: BusinessDetail }) {
  const t = useTranslations("business");
  const { startChat, busy: chatBusy, isOwner } = useBusinessChat(
    business.id,
    business.owner_id,
    business.slug,
  );
  const waNumber = business.whatsapp?.replace(/\D/g, "");

  type MobileAction = {
    icon: typeof Phone;
    label: string;
    href?: string;
    onClick?: () => void;
    busy?: boolean;
    enabled: boolean;
  };

  const actions: MobileAction[] = [
    {
      icon: Phone,
      label: t("call"),
      href: business.phone ? `tel:${business.phone}` : undefined,
      enabled: Boolean(business.phone),
    },
    {
      icon: MessageCircle,
      label: t("whatsapp"),
      href: waNumber ? `https://wa.me/${waNumber}` : undefined,
      enabled: Boolean(waNumber),
    },
    {
      icon: MessageSquare,
      label: t("chat"),
      onClick: () => void startChat(),
      busy: chatBusy,
      enabled: !isOwner,
    },
    {
      icon: MapPin,
      label: t("directions"),
      href:
        business.lat && business.lng
          ? `https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lng}`
          : business.address
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                business.address,
              )}`
            : undefined,
      enabled: Boolean(
        (business.lat && business.lng) || business.address,
      ),
    },
  ];

  return (
    <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 rounded-2xl border bg-card/95 p-1.5 shadow-lift backdrop-blur lg:hidden">
      <div className="grid grid-cols-4 gap-1">
        {actions.map((action) =>
          action.onClick ? (
            <Button
              key={action.label}
              type="button"
              variant={action.enabled ? "outline" : "ghost"}
              size="sm"
              className="flex-col gap-0.5 h-auto py-2 text-[11px]"
              disabled={!action.enabled || action.busy}
              aria-busy={action.busy || undefined}
              onClick={() => {
                action.onClick?.();
              }}
            >
              {action.busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <action.icon className="size-4" />
              )}
              {action.label}
            </Button>
          ) : (
            <Button
              key={action.label}
              variant={action.enabled ? "outline" : "ghost"}
              size="sm"
              className="flex-col gap-0.5 h-auto py-2 text-[11px]"
              disabled={!action.enabled}
              asChild={action.enabled}
            >
              {action.enabled && action.href ? (
                <a href={action.href} target="_blank" rel="noopener noreferrer">
                  <action.icon className="size-4" />
                  {action.label}
                </a>
              ) : (
                <>
                  <action.icon className="size-4" />
                  {action.label}
                </>
              )}
            </Button>
          ),
        )}
      </div>
    </div>
  );
}
