"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LogOut, Search, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import type { Profile, UserRole } from "@/lib/supabase/database.types";
import type { AdminUserRow } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  users: AdminUserRow[];
};

const ROLES: UserRole[] = ["client", "owner", "admin"];

async function api(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export function UsersTable({ users }: Props) {
  const t = useTranslations("admin");
  const [rows, setRows] = useState<AdminUserRow[]>(users);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | UserRole>("all");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((u) => {
      if (role !== "all" && u.role !== role) return false;
      if (!q) return true;
      return [u.full_name, u.phone, u.city, u.email].some((v) => v?.toLowerCase().includes(q));
    });
  }, [rows, query, role]);

  function update(id: string, patch: Partial<Profile>) {
    setRows((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  async function patch(id: string, p: Record<string, unknown>, local: Partial<Profile>) {
    setBusy(true);
    setFeedback(null);
    try {
      if (await api("/api/admin/users", { id, ...p })) {
        update(id, local);
        setFeedback({ kind: "ok", msg: t("updateSuccess") });
      } else {
        setFeedback({ kind: "err", msg: t("updateError") });
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setRows((prev) => prev.filter((u) => u.id !== id));
        setFeedback({ kind: "ok", msg: t("updateSuccess") });
      } else {
        setFeedback({ kind: "err", msg: t("updateError") });
      }
    } finally {
      setBusy(false);
    }
  }

  async function forceLogout(u: AdminUserRow) {
    if (!confirm(t("forceLogoutConfirm", { name: u.full_name ?? u.email ?? u.id }))) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/users/force-logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id }),
      });
      if (res.ok) setFeedback({ kind: "ok", msg: t("sessionsRevoked") });
      else setFeedback({ kind: "err", msg: t("forceLogoutFailed") });
    } finally {
      setBusy(false);
    }
  }

  function fmtDate(v: string) {
    return new Date(v).toLocaleDateString();
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          className={
            "rounded-xl border px-4 py-2 text-sm " +
            (feedback.kind === "ok"
              ? "border-emerald-400/40 bg-emerald-500/5 text-emerald-600"
              : "border-destructive/40 bg-destructive/5 text-destructive")
          }
        >
          {feedback.msg}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-10 w-full rounded-lg border border-input bg-background ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "all" | UserRole)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">{t("all")}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {t(r)}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border bg-card">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t("name")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("email")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("role")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("status")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("registered")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("businesses")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("provider")}</th>
                <th className="px-4 py-3 text-end font-medium">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium">{user.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                    {user.email ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      disabled={busy}
                      onChange={(e) =>
                        patch(
                          user.id,
                          { role: e.target.value },
                          { role: e.target.value as UserRole },
                        )
                      }
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {t(r)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {user.banned ? (
                      <Badge variant="destructive">{t("banned")}</Badge>
                    ) : user.suspended ? (
                      <Badge variant="warning">{t("suspended")}</Badge>
                    ) : (
                      <Badge variant="success">{t("active")}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                    {fmtDate(user.created_at)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.business_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.provider ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        size="sm"
                        variant={user.banned ? "default" : "ghost"}
                        disabled={busy}
                        onClick={() =>
                          patch(user.id, { banned: !user.banned }, { banned: !user.banned })
                        }
                      >
                        {user.banned ? (
                          <ShieldCheck className="size-4" />
                        ) : (
                          <ShieldOff className="size-4" />
                        )}
                        <span className="sr-only">
                          {user.banned ? t("unban") : t("ban")}
                        </span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          patch(
                            user.id,
                            { suspended: !user.suspended },
                            { suspended: !user.suspended },
                          )
                        }
                      >
                        <span className="text-xs">
                          {user.suspended ? t("unsuspend") : t("suspend")}
                        </span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => forceLogout(user)}
                        title={t("forceLogout")}
                      >
                        <LogOut className="size-4" />
                        <span className="sr-only">{t("forceLogout")}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => remove(user.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
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
