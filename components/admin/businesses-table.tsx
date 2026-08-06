"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  BadgeCheck,
  Banknote,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { localizedName, type Locale } from "@/lib/translations";
import type {
  AdminBusiness,
} from "@/lib/queries";
import {
  type BusinessStatus,
  type PlanType,
  type VerificationStatus,
} from "@/lib/supabase/database.types";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Props = {
  businesses: AdminBusiness[];
  locale: Locale;
};

const STATUSES: BusinessStatus[] = [
  "approved",
  "pending_review",
  "rejected",
  "suspended",
];
const PLANS: PlanType[] = ["free", "premium", "pro"];

export function BusinessesTable({ businesses, locale }: Props) {
  const t = useTranslations("admin");
  const [rows, setRows] = useState(businesses);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | BusinessStatus>("all");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((b) => {
      if (status !== "all" && b.status !== status) return false;
      if (!q) return true;
      return [b.name, b.city, b.profiles?.full_name].some((v) =>
        v?.toLowerCase().includes(q),
      );
    });
  }, [rows, query, status]);

  async function api(path: string, method: string, body?: unknown) {
    setBusy(true);
    try {
      const res = await fetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      return res.ok;
    } finally {
      setBusy(false);
    }
  }

  function update(id: string, patch: Partial<AdminBusiness>) {
    setRows((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  async function applyStatus(b: AdminBusiness, newStatus: BusinessStatus) {
    if (await api("/api/admin/businesses", "PATCH", { id: b.id, status: newStatus }))
      update(b.id, { status: newStatus });
  }
  async function setPlan(b: AdminBusiness, plan: PlanType) {
    if (await api("/api/admin/businesses", "PATCH", { id: b.id, plan }))
      update(b.id, { plan });
  }
  async function setVerification(b: AdminBusiness, verification_status: VerificationStatus) {
    if (
      await api("/api/admin/businesses", "PATCH", {
        id: b.id,
        verification_status,
      })
    )
      update(b.id, { verification_status, verified: verification_status === "verified" });
  }
  async function remove(b: AdminBusiness) {
    if (!confirm(t("confirmDelete"))) return;
    if (await api(`/api/admin/businesses?id=${b.id}`, "DELETE"))
      setRows((prev) => prev.filter((x) => x.id !== b.id));
  }

  const statusBadge = (s: BusinessStatus) => {
    const map: Record<BusinessStatus, "default" | "success" | "warning" | "destructive"> = {
      approved: "success",
      pending_review: "warning",
      rejected: "destructive",
      suspended: "destructive",
    };
    return <Badge variant={map[s]}>{t(s)}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "all" | BusinessStatus)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">{t("all")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(s)}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border bg-card">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t("name")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("category")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("owner")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("plan")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("status")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("verify")}</th>
                <th className="px-4 py-3 text-end font-medium">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-medium">{b.name}</td>
                  <td className="px-4 py-3">
                    {b.categories ? localizedName(b.categories, locale) : "—"}
                  </td>
                  <td className="px-4 py-3">{b.profiles?.full_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={b.plan}
                      disabled={busy}
                      onChange={(e) => setPlan(b, e.target.value as PlanType)}
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    >
                      {PLANS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">{statusBadge(b.status)}</td>
                  <td className="px-4 py-3">
                    {b.verification_status === "verified" ? (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
                        <BadgeCheck className="size-4" />
                        {t("markVerified")}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setVerification(b, "verified")}
                      >
                        <ShieldCheck className="size-4" />
                        {t("verify")}
                      </Button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <select
                        value={b.status}
                        disabled={busy}
                        onChange={(e) => applyStatus(b, e.target.value as BusinessStatus)}
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {t(s)}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => remove(b)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                      <Link
                        href={`/business/${b.slug}`}
                        target="_blank"
                        className="inline-flex size-9 items-center justify-center rounded-md hover:bg-muted"
                        title={t("viewPage")}
                      >
                        <Banknote className="size-4" />
                        <span className="sr-only">{t("viewPage")}</span>
                      </Link>
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