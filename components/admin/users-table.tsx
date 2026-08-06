"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import type { Profile, UserRole } from "@/lib/supabase/database.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  users: Profile[];
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
  const tCommon = useTranslations("common");
  const [rows, setRows] = useState(users);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | UserRole>("all");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((u) => {
      if (role !== "all" && u.role !== role) return false;
      if (!q) return true;
      return [u.full_name, u.phone, u.city].some((v) =>
        v?.toLowerCase().includes(q),
      );
    });
  }, [rows, query, role]);

  function update(id: string, patch: Partial<Profile>) {
    setRows((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  async function patch(id: string, patch: Record<string, unknown>, local: Partial<Profile>) {
    setBusy(true);
    try {
      if (await api("/api/admin/users", { id, ...patch })) update(id, local);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      if (res.ok) setRows((prev) => prev.filter((u) => u.id !== id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
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
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t("name")}</th>
                <th className="px-4 py-3 text-start font-medium">{tCommon("phone")}</th>
                <th className="px-4 py-3 text-start font-medium">{tCommon("city")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("role")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("status")}</th>
                <th className="px-4 py-3 text-end font-medium">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium">{user.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                    {user.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3">{user.city ?? "—"}</td>
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
                          {r}
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
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
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