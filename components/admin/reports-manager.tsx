"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Clock, FlaskConical, ShieldCheck } from "lucide-react";
import type { AdminReport } from "@/lib/queries";
import type { ReportStatus } from "@/lib/supabase/database.types";
import type { Locale } from "@/lib/translations";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  reports: AdminReport[];
  locale: Locale;
};

const STATUSES: ReportStatus[] = ["open", "reviewed", "resolved"];

export function ReportsManager({ reports, locale }: Props) {
  const t = useTranslations("admin");
  const [rows, setRows] = useState(reports);
  const [filter, setFilter] = useState<"all" | ReportStatus>("all");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );

  async function setStatus(r: AdminReport, status: ReportStatus) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, status }),
      });
      if (res.ok)
        setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, status } : x)));
    } finally {
      setBusy(false);
    }
  }

const badge = (s: ReportStatus) => {
    const map: Record<ReportStatus, "warning" | "default" | "success"> = {
      open: "warning",
      reviewed: "default",
      resolved: "success",
    };
    return <Badge variant={map[s]}>{t(s)}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors " +
              (filter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground/75 hover:bg-muted/70")
            }
          >
            {s === "all" ? t("all") : t(s)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border bg-card">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t("businesses")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("name")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("reason")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("status")}</th>
                <th className="px-4 py-3 text-end font-medium">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    {r.businesses ? (
                      <Link
                        href={`/business/${r.businesses.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        {r.businesses.name}
                        <FlaskConical className="size-3.5" />
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.profiles?.full_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 max-w-[220px] truncate">{r.reason ?? "—"}</td>
                  <td className="px-4 py-3">{badge(r.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {r.status !== "resolved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => setStatus(r, "resolved")}
                        >
                          <ShieldCheck className="size-4" />
                          {t("resolve")}
                        </Button>
                      )}
                      <Badge className="gap-1 px-2">
                        <Clock className="size-3" />
                        {new Intl.DateTimeFormat(
                          locale === "ar" ? "ar-MA" : locale,
                          { day: "numeric", month: "short" },
                        ).format(new Date(r.created_at))}
                      </Badge>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}