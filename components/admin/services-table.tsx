"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { AdminService } from "@/lib/queries";

type Filter = "pending" | "all" | "published" | "archived";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 ring-amber-200",
  published: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  archived: "bg-rose-100 text-rose-800 ring-rose-200",
  draft: "bg-slate-100 text-slate-700 ring-slate-200",
};

async function api(path: string, method: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.ok;
}

export function ServicesTable({ services }: { services: AdminService[] }) {
  const t = useTranslations("admin");
  const [list, setList] = useState<AdminService[]>(services);
  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingCount = useMemo(
    () => list.filter((s) => s.status === "pending").length,
    [list],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (q) {
        const hay = `${s.name} ${s.business?.name ?? ""} ${
          s.business?.profiles?.full_name ?? ""
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [list, filter, query]);

  function apply(id: string, newStatus: "published" | "archived") {
    setBusyId(id);
    void api("/api/admin/services", "PATCH", { id, status: newStatus }).then((ok) => {
      if (ok) setList((prev) => prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s)));
      setBusyId(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge
            className={
              pendingCount > 0
                ? "bg-amber-100 text-amber-800 ring-amber-200"
                : "bg-emerald-100 text-emerald-800 ring-emerald-200"
            }
          >
            {t("pendingServices", { count: pendingCount })}
          </Badge>
          {(["pending", "all", "published", "archived"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={
                "rounded-full px-3 py-1 text-sm font-medium transition-colors " +
                (filter === f
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "text-foreground/70 hover:bg-muted")
              }
            >
              {f === "pending"
                ? t("pending")
                : f === "all"
                  ? t("all")
                  : f === "published"
                    ? t("published")
                    : t("archived")}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="ps-9"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t("name")}</th>
              <th className="px-4 py-3 font-medium">{t("business")}</th>
              <th className="px-4 py-3 font-medium">{t("owner")}</th>
              <th className="px-4 py-3 font-medium">{t("status")}</th>
              <th className="px-4 py-3 text-end font-medium">{t("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-foreground/80">{s.business?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-foreground/80">
                    {s.business?.profiles?.full_name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={"ring-1 " + (STATUS_STYLE[s.status] ?? STATUS_STYLE.draft)}>
                      {t(
                        s.status === "pending"
                          ? "pending"
                          : s.status === "published"
                            ? "published"
                            : s.status === "archived"
                              ? "archived"
                              : "draft",
                      )}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-700"
                        disabled={busyId === s.id || s.status === "published"}
                        onClick={() => apply(s.id, "published")}
                      >
                        <Check className="me-1 size-4" />
                        {t("approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-rose-700"
                        disabled={busyId === s.id || s.status === "archived"}
                        onClick={() => apply(s.id, "archived")}
                      >
                        <X className="me-1 size-4" />
                        {t("reject")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
