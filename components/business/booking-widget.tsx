"use client";

import { CalendarDays, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BusinessDetail } from "@/lib/queries";

function toLocalDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function BookingWidget({ business }: { business: BusinessDetail }) {
  const t = useTranslations("business");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );

  const today = useMemo(() => toLocalDate(new Date()), []);
  const hasBookingFeature = business.plan !== "free";

  const availableSlots = useMemo(() => {
    if (!date) return [];
    const dayOfWeek = new Date(`${date}T12:00:00`).getDay();
    const hour = business.hours.find((h) => h.day_of_week === dayOfWeek);
    if (!hour || hour.is_closed || !hour.open_time || !hour.close_time) return [];

    const [oh, om] = hour.open_time.slice(0, 5).split(":").map(Number);
    const [ch, cm] = hour.close_time.slice(0, 5).split(":").map(Number);

    const slots: string[] = [];
    let current = oh * 60 + om;
    const end = ch * 60 + cm;
    const step = 60;

    while (current + step <= end) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      current += step;
    }
    return slots;
  }, [date, business.hours]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !phone || !date || !time) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          business_id: business.id,
          service_id: serviceId || null,
          client_name: name,
          client_phone: phone,
          booking_date: date,
          booking_time: time,
        }),
      });

      if (!res.ok) throw new Error();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (business.hours.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-secondary/60 p-4">
        <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
          <CalendarDays className="size-4 text-primary" />
          {t("booking")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {!hasBookingFeature ? (
          <p className="text-sm text-muted-foreground">
            {t("bookingPremiumOnly")}
          </p>
        ) : status === "success" ? (
          <div className="rounded-xl bg-success/10 p-4 text-sm text-success">
            {t("bookingSuccess")}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("chooseService")}</Label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">
                  {business.services[0]?.name ?? t("chooseService")}
                </option>
                {business.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("chooseDate")}</Label>
              <Input
                type="date"
                min={today}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setTime("");
                }}
                required
              />
            </div>

            {date && (
              <div className="space-y-1.5">
                <Label>{t("chooseTime")}</Label>
                {availableSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("closedToday")}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setTime(slot)}
                        className={
                          "rounded-lg border px-2 py-2 text-sm transition-colors " +
                          (time === slot
                            ? "border-primary bg-primary text-primary-foreground"
                            : "hover:border-primary/50")
                        }
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("yourName")}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("yourPhone")}</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            {status === "error" && (
              <p className="text-sm text-destructive">{t("bookingFailed")}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={status === "loading" || !time}
            >
              {status === "loading" && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {t("confirmBooking")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
