"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, X, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  client_name: string;
  client_phone: string;
  booking_date: string;
  booking_time: string;
  status: string;
  notes?: string | null;
  services?: { name: string } | null;
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  confirmed: "bg-success/10 text-success",
  accepted: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted/10 text-muted-foreground",
};

export function BookingsManager({ bookings }: { bookings: Row[] }) {
  const t = useTranslations("dashboard.dash");
  const [rows, setRows] = useState<Row[]>(bookings);
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(id: string, status: string) {
    setBusy(id);
    try {
      const res = await fetch("/api/dashboard/bookings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ booking_id: id, status }),
      });
      if (res.ok) {
        setRows((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
      }
    } finally {
      setBusy(null);
    }
  }

  const statusLabel = (s: string) =>
    t(s === "accepted" ? "accepted" : s === "rejected" ? "rejected" : s === "completed" ? "completed" : s) ??
    s;

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t("noBookings")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((b) => {
        const actionable =
          b.status === "pending" || b.status === "confirmed" || b.status === "accepted";
        return (
          <div key={b.id} className="rounded-3xl border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{b.client_name}</p>
                <p dir="ltr" className="text-sm text-muted-foreground">
                  {b.client_phone}
                </p>
                {b.services?.name && (
                  <p className="mt-1 text-sm text-muted-foreground">{b.services.name}</p>
                )}
                {b.notes && (
                  <p className="mt-1 text-xs text-muted-foreground">“{b.notes}”</p>
                )}
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  STATUS_STYLE[b.status] ?? "bg-muted text-muted-foreground",
                )}
              >
                {statusLabel(b.status)}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {new Date(b.booking_date + "T00:00:00").getTime() < 0
                  ? b.booking_date
                  : new Date(b.booking_date + "T00:00:00").toLocaleDateString()}{" "}
                · {b.booking_time}
              </p>
              {actionable && (
                <div className="flex flex-wrap items-center gap-2">
                  {b.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === b.id}
                        onClick={() => setStatus(b.id, "rejected")}
                      >
                        <X className="size-4" />
                        {t("reject")}
                      </Button>
                      <Button
                        size="sm"
                        disabled={busy === b.id}
                        onClick={() => setStatus(b.id, "accepted")}
                      >
                        {busy === b.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                        {t("accept")}
                      </Button>
                    </>
                  )}
                  {b.status === "accepted" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === b.id}
                        onClick={() => setStatus(b.id, "cancelled")}
                      >
                        <X className="size-4" />
                        {t("cancel")}
                      </Button>
                      <Button
                        size="sm"
                        disabled={busy === b.id}
                        onClick={() => setStatus(b.id, "completed")}
                      >
                        {busy === b.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <PackageCheck className="size-4" />
                        )}
                        {t("complete")}
                      </Button>
                    </>
                  )}
                  {b.status === "confirmed" && (
                    <Button
                      size="sm"
                      disabled={busy === b.id}
                      onClick={() => setStatus(b.id, "completed")}
                    >
                      <PackageCheck className="size-4" />
                      {t("complete")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}