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
import { useTranslations } from "next-intl";
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
      className="h-fit space-y-4 lg:sticky lg:top-24"
    >
      {/* Verification / status card */}
      <div className="rounded-3xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "grid size-10 place-items-center rounded-2xl",
              business.verified
                ? "bg-success/10 text-success"
                : "bg-muted text-muted-foreground",
            )}
          >
            <ShieldCheck className="size-5" />
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

        {/* Today hours */}
        {business.hours.length > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
            <span className="flex items-center gap-1.5 text-sm">
              <Clock className="size-4 text-muted-foreground" />
              {weekdayName(new Date().getDay(), "en")}
            </span>
            <span
              className={cn(
                "text-sm font-semibold",
                open ? "text-success" : "text-destructive",
              )}
            >
              {today && !today.is_closed
                ? formatTimeRange(today.open_time, today.close_time, "en")
                : t("closedToday")}
            </span>
          </div>
        )}

        {/* Primary actions */}
        <div className="mt-4 grid gap-2.5">
          <Button asChild className="w-full gap-2 rounded-2xl">
            <a href={`tel:${business.phone}`}>
              <Phone className="size-4" />
              {t("call")}
            </a>
          </Button>
          {waNumber && (
            <Button
              asChild
              variant="outline"
              className="w-full gap-2 rounded-2xl"
            >
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
        <div className="mt-4 space-y-2.5 border-t pt-4">
          {contact.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="flex items-start gap-2.5">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
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
          <div className="flex items-start gap-2.5">
            <Timer className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {dt("avgResponse")}
              </p>
              <p className="text-sm font-medium">{dt("within24h")}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}