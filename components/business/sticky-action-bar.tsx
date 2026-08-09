"use client";

import { Globe, MapPin, MessageCircle, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { BusinessDetail } from "@/lib/queries";

export function StickyActionBar({ business }: { business: BusinessDetail }) {
  const t = useTranslations("business");
  const waNumber = business.whatsapp?.replace(/\D/g, "");

  const actions = [
    {
      icon: Phone,
      label: t("call"),
      href: business.phone ? `tel:${business.phone}` : undefined,
      enabled: Boolean(business.phone),
    },
    {
      icon: MessageCircle,
      label: t("whatsapp"),
      href: waNumber
        ? `https://wa.me/${waNumber}`
        : undefined,
      enabled: Boolean(waNumber),
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
    {
      icon: Globe,
      label: t("website"),
      href: undefined,
      enabled: false,
    },
  ];

  return (
    <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 rounded-2xl border bg-card/90 p-2 shadow-lift backdrop-blur lg:hidden">
      <div className="grid grid-cols-4 gap-1.5">
        {actions.map((action) => (
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
        ))}
      </div>
    </div>
  );
}
