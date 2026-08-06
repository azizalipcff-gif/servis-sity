"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { BookingStatus } from "@/lib/supabase/database.types";
import { Badge } from "@/components/ui/badge";

type BookingRow = {
  id: string;
  client_name: string;
  client_phone: string;
  booking_date: string;
  booking_time: string;
  status: BookingStatus;
  businesses: { name: string; slug: string } | null;
  services: { name: string } | null;
};

type Props = {
  bookings: BookingRow[];
};

const STATUSES: BookingStatus[] = ["pending", "confirmed", "cancelled"];

const STATUS_VARIANT: Record<BookingStatus, "warning" | "success" | "destructive"> = {
  pending: "warning",
  confirmed: "success",
  cancelled: "destructive",
};

export function BookingsTable({ bookings }: Props) {
  const t = useTranslations("admin");
  const tDash = useTranslations("dashboard");
  const [rows, setRows] = useState(bookings);

  async function changeStatus(id: string, status: BookingStatus) {
    const supabase = createClient();
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id);
    if (!error) {
      setRows((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    }
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noData")}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-start font-medium">{t("client")}</th>
            <th className="px-4 py-3 text-start font-medium">{t("businesses")}</th>
            <th className="px-4 py-3 text-start font-medium">{t("service")}</th>
            <th className="px-4 py-3 text-start font-medium">{t("date")}</th>
            <th className="px-4 py-3 text-start font-medium">{t("time")}</th>
            <th className="px-4 py-3 text-start font-medium">{t("status")}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((booking) => (
            <tr key={booking.id}>
              <td className="px-4 py-3">
                <p className="font-medium">{booking.client_name}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {booking.client_phone}
                </p>
              </td>
              <td className="px-4 py-3">{booking.businesses?.name ?? "—"}</td>
              <td className="px-4 py-3">{booking.services?.name ?? "—"}</td>
              <td className="px-4 py-3">{booking.booking_date}</td>
              <td className="px-4 py-3">{booking.booking_time}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS_VARIANT[booking.status]}>
                    {tDash(booking.status)}
                  </Badge>
                  <select
                    value={booking.status}
                    onChange={(e) =>
                      changeStatus(booking.id, e.target.value as BookingStatus)
                    }
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {tDash(status)}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
