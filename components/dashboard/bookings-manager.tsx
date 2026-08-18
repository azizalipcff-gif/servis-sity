"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Check, Copy, List, Loader2, X, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { businessPath } from "@/lib/business/url";
import type { BusinessDetail } from "@/lib/queries";

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

function BookingCard({
  booking,
  busy,
  onStatus,
  t,
  statusLabel,
}: {
  booking: Row;
  busy: string | null;
  onStatus: (id: string, status: string) => void;
  t: (key: string) => string;
  statusLabel: (s: string) => string;
}) {
  const b = booking;
  const actionable =
    b.status === "pending" || b.status === "confirmed" || b.status === "accepted";
  return (
    <div className="rounded-3xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{b.client_name}</p>
          <p dir="ltr" className="text-sm text-muted-foreground">
            {b.client_phone}
          </p>
          {b.services?.name && (
            <p className="mt-1 text-sm text-muted-foreground">{b.services.name}</p>
          )}
          {b.notes && <p className="mt-1 text-xs text-muted-foreground">“{b.notes}”</p>}
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
        <p dir="ltr" className="text-sm text-muted-foreground">
          {b.booking_date} · {b.booking_time}
        </p>
        {actionable && (
          <div className="flex flex-wrap items-center gap-2">
            {b.status === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === b.id}
                  onClick={() => onStatus(b.id, "rejected")}
                >
                  <X className="size-4" />
                  {t("reject")}
                </Button>
                <Button
                  size="sm"
                  disabled={busy === b.id}
                  onClick={() => onStatus(b.id, "accepted")}
                >
                  {busy === b.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
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
                  onClick={() => onStatus(b.id, "cancelled")}
                >
                  <X className="size-4" />
                  {t("cancel")}
                </Button>
                <Button
                  size="sm"
                  disabled={busy === b.id}
                  onClick={() => onStatus(b.id, "completed")}
                >
                  {busy === b.id ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />}
                  {t("complete")}
                </Button>
              </>
            )}
            {b.status === "confirmed" && (
              <Button
                size="sm"
                disabled={busy === b.id}
                onClick={() => onStatus(b.id, "completed")}
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
}

export function BookingsManager({
  bookings,
  business,
}: {
  bookings: Row[];
  business: BusinessDetail;
}) {
  const t = useTranslations("dashboard.dash");
  const locale = useLocale();
  const [rows, setRows] = useState<Row[]>(bookings);
  const [busy, setBusy] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [copied, setCopied] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

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

  const onCopyLink = async () => {
    const url = `${window.location.origin}${businessPath(locale, business)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const dayCounts = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((b) => {
      counts.set(b.booking_date, (counts.get(b.booking_date) ?? 0) + 1);
    });
    return counts;
  }, [rows]);

  const monthDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const dayCount = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = Array.from({ length: firstWeekday }, () => null);
    for (let d = 1; d <= dayCount; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push(iso);
    }
    return cells;
  }, []);

  const dayBookings = selectedDay
    ? rows.filter((b) => b.booking_date === selectedDay)
    : [];

  const titleRow = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="flex rounded-xl border bg-card p-0.5">
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              view === "list"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <List className="size-4" />
            {t("listView")}
          </button>
          <button
            type="button"
            onClick={() => setView("calendar")}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              view === "calendar"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CalendarDays className="size-4" />
            {t("calendarView")}
          </button>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onCopyLink}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? t("linkCopied") : t("copyPublicLink")}
      </Button>
    </div>
  );

  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        {titleRow}
        <div className="rounded-3xl border border-dashed p-10 text-center">
          <p className="text-sm font-medium text-foreground">{t("noBookingsTitle")}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {t("noBookingsHint")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {titleRow}

      {view === "list" && (
        <div className="space-y-3">
          {rows.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              busy={busy}
              onStatus={setStatus}
              t={t}
              statusLabel={statusLabel}
            />
          ))}
        </div>
      )}

      {view === "calendar" && (
        <div className="space-y-4">
          <div className="rounded-3xl border bg-card p-5">
            <p className="mb-3 text-sm font-semibold">
              {new Intl.DateTimeFormat(locale, {
                month: "long",
                year: "numeric",
              }).format(new Date())}
            </p>
            <div className="grid grid-cols-7 gap-1 text-center">
              {["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map((d) => (
                <span key={d} className="text-[11px] font-medium text-muted-foreground">
                  {t(`day.${d}`)}
                </span>
              ))}
              {monthDays.map((iso, i) =>
                iso === null ? (
                  <span key={`empty-${i}`} />
                ) : (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedDay(iso)}
                    className={cn(
                      "relative mx-auto flex size-9 items-center justify-center rounded-full text-sm transition-colors",
                      selectedDay === iso
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    {Number(iso.slice(8, 10))}
                    {dayCounts.has(iso) && (
                      <span
                        className={cn(
                          "absolute -top-0.5 end-0.5 size-2 rounded-full",
                          selectedDay === iso ? "bg-background" : "bg-primary",
                        )}
                      />
                    )}
                  </button>
                ),
              )}
            </div>
          </div>

          {selectedDay ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("dayBookings", { date: selectedDay })}
              </p>
              {dayBookings.length === 0 ? (
                <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {t("noDayBookings")}
                </p>
              ) : (
                dayBookings.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    busy={busy}
                    onStatus={setStatus}
                    t={t}
                    statusLabel={statusLabel}
                  />
                ))
              )}
            </div>
          ) : (
            <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t("calendarHint")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}