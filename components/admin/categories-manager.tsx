"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import type { Category } from "@/lib/supabase/database.types";
import { localizedName, type Locale } from "@/lib/translations";
import { Button } from "@/components/ui/button";

type Props = {
  categories: Category[];
  locale: Locale;
};

export function CategoriesManager({ categories, locale }: Props) {
  const t = useTranslations("admin");
  const [rows, setRows] = useState(categories);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      if (res.ok) {
        setName("");
        setSlug("");
        const ref = await fetch("/api/admin/categories");
        if (ref.ok) setRows(await ref.json());
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" });
      if (res.ok) setRows((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("addCategory")}
          className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:max-w-xs"
        />
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="slug"
          className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:max-w-[160px]"
        />
        <Button type="submit" size="sm" disabled={busy}>
          <Plus className="size-4" />
          {t("saved")}
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {c.icon} {localizedName(c, locale)}
                </p>
                <p className="truncate text-xs text-muted-foreground" dir="ltr">
                  {c.slug}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => remove(c.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}