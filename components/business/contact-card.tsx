"use client";

import { motion } from "framer-motion";
import {
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatTimeRange,
  hoursForDay,
  isOpenNow,
  weekdayName,
} from "@/lib/hours";
import type { BusinessDetail } from "@/lib/queries";

export function ContactCard({ business }: { business: BusinessDetail }) {
  const t = useTranslations("business");
  const dt = useTranslations("business.detail");
  const locale = useLocale();
  const waNumber = business.whatsapp?.replace(/\D/g, "");
  const open = isOpenNow(business.hours);
  const today = hoursForDay(business.hours, new Date().getDay());

  const contact = [
    {
      icon: Phone,
      label: dt("phone"),
      value: business.phone,
      href: business.phone ? `tel:${business.phone}` : undefined,
    },
    {
      icon: MessageCircle,
      label: t("whatsapp"),
      value: waNumber ? `+${waNumber}` : undefined,
      href: waNumber ? `https://wa.me/${waNumber}` : undefined,
    },
    {
      icon: MapPin,
      label: t("addressTitle"),
      value: business.address || business.city,
      href: undefined,
    },
  ].filter((c) => c.value);

  return (
    <motion.aside
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      className="h-fit"
    >
      <div className="rounded-2xl border bg-card">
        {/* Status + today hours */}
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "grid size-9 place-items-center rounded-lg",
                business.verified
                  ? "bg-success/10 text-success"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              <ShieldCheck className="size-[18px]" />
            </span>
            <div>
              <p
                className={cn(
                  "text-sm font-semibold",
                  business.verified && "text-success",
                )}
              >
                {business.verified ? t("verified") : dt("unverified")}
              </p>
              <p className="text-xs text-muted-foreground">
                {business.verified ? dt("verifiedReview") : t("updateSoon")}
              </p>
            </div>
          </div>

          {business.hours.length > 0 && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-secondary/50 px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-sm">
                <Clock className="size-4 text-muted-foreground" />
                {weekdayName(new Date().getDay(), locale)}
              </span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  open ? "text-success" : "text-muted-foreground",
                )}
              >
                {today && !today.is_closed
                  ? formatTimeRange(today.open_time, today.close_time, locale)
                  : t("closedToday")}
              </span>
            </div>
          )}
        </div>

        {/* Primary actions */}
        <div className="grid gap-2 p-4">
          <Button asChild className="w-full gap-2">
            <a href={`tel:${business.phone}`}>
              <Phone className="size-4" />
              {t("call")}
            </a>
          </Button>
          {waNumber && (
            <Button asChild variant="outline" className="w-full gap-2">
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="size-4 text-success" />
                {t("whatsapp")}
              </a>
            </Button>
          )}
        </div>

        {/* Contact rows */}
        {contact.length > 0 && (
          <div className="space-y-3 border-t border-border p-4">
            {contact.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="flex items-start gap-3">
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {c.label}
                    </p>
                    {c.href ? (
                      <a
                        href={c.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-sm font-medium hover:text-primary"
                      >
                        {c.value}
                      </a>
                    ) : (
                      <p className="truncate text-sm font-medium">{c.value}</p>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="flex items-start gap-3">
              <Timer className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {dt("avgResponse", { time: dt("within24h") })}
                </p>
                <p className="text-sm font-medium">{dt("within24h")}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
}