"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { Product } from "@/lib/supabase/database.types";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  businessId?: string;
  initial?: Product[];
};

export function ProductsManager({ initial = [] }: Props) {
  const t = useTranslations("products");

  const [products, setProducts] = useState<Product[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    const id = confirmId;
    if (!id) return;
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/products/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
      } else {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(mapError(data?.error));
      }
    } catch {
      setError(t("deleteError"));
    } finally {
      setBusy(null);
      setConfirmId(null);
    }
  }

  function mapError(code?: string): string {
    if (code === "not_archived") return t("deleteNotArchived");
    return t("deleteError");
  }

  const statusLabel = (s: string) =>
    s === "published"
      ? t("statusPublished")
      : s === "archived"
        ? t("statusArchived")
        : t("statusDraft");

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {products.length === 0 ? t("empty") : `${products.length}`}
          </CardDescription>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/products/new">
            <Plus className="size-4" />
            {t("add")}
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {products.length === 0 ? (
          <EmptyState
            icon={<Plus className="size-5" />}
            title={t("title")}
            description={t("addHint")}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-xl border bg-card">
                {p.images?.[0] ? (
                  <div className="h-32 w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center bg-muted text-muted-foreground" />
                )}
                <div className="space-y-1 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    {p.featured && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        {t("featured")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {p.price != null ? `${p.price} MAD` : "—"}
                    {p.stock === 0 ? ` · ${t("stockEmpty")}` : ` · ${p.stock}`}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {statusLabel(p.status)}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="default" size="sm" asChild>
                        <Link href={`/dashboard/products/${p.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                          {t("edit")}
                        </Link>
                      </Button>
                      {p.status === "archived" ? (
                        <Button
                          variant="ghost"
                          size="iconSm"
                          disabled={busy === p.id}
                          onClick={() => setConfirmId(p.id)}
                          aria-label={t("delete")}
                        >
                          {busy === p.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <ConfirmDialog
        open={confirmId !== null}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancelDelete")}
        busy={confirmId !== null && busy === confirmId}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmId(null)}
      />
    </Card>
  );
}
