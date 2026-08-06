"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BookingsManager({
  bookings,
}: {
  bookings: {
    id: string;
    client_name: string;
    client_phone: string;
    booking_date: string;
    booking_time: string;
    status: string;
    services: { name: string } | null;
  }[];
}) {
  const t = useTranslations("dashboard.dash");
  const [busy, setBusy] = useState<string | null>(null);

  async function update(id: string, status: "confirmed" | "cancelled") {
    setBusy(id);
    try {
      await fetch("/api/dashboard/bookings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ booking_id: id, id, status }),
      });
      window.location.reload();
    } finally {
      setBusy(null);
    }
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t("noBookings")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <div key={b.id} className="rounded-3xl border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{b.client_name}</p>
              <p dir="ltr" className="text-sm text-muted-foreground">
                {b.client_phone}
              </p>
              {b.services?.name && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {b.services.name}
                </p>
              )}
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                b.status === "confirmed" && "bg-success/10 text-success",
                b.status === "cancelled" && "bg-destructive/10 text-destructive",
                b.status === "pending" && "bg-warning/10 text-warning",
              )}
            >
              {b.status === "confirmed"
                ? t("confirmed")
                : b.status === "cancelled"
                  ? t("cancelled")
                  : t("pending")}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {new Date(b.booking_date + "T00:00:00").toLocaleDateString()} ·{" "}
              {b.booking_time}
            </p>
            {b.status === "pending" && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => update(b.id, "cancelled")}
                  disabled={busy === b.id}
                >
                  <X className="size-4" />
                  {t("cancel")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => update(b.id, "confirmed")}
                  disabled={busy === b.id}
                >
                  {busy === b.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  {t("confirm")}
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}