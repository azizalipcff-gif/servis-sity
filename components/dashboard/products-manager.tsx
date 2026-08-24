"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import type { Product } from "@/lib/supabase/database.types";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CardActionsMenu } from "@/components/dashboard/card-actions-menu";
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
  const tActions = useTranslations("actions");

  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [pinningId, setPinningId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const confirmName = products.find((p) => p.id === confirmId)?.name ?? "";

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
        setSuccess(t("deleteSuccess"));
        router.refresh();
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

  async function togglePin(id: string, current: boolean) {
    setPinningId(id);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/products/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ featured: !current }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, featured: !current } : p)),
        );
        setSuccess(current ? tActions("unpinned") : tActions("pinned"));
        router.refresh();
      } else {
        setError(tActions("pinFailed"));
      }
    } catch {
      setError(tActions("pinFailed"));
    } finally {
      setPinningId(null);
    }
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
        {success ? (
          <p className="mb-3 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
            {success}
          </p>
        ) : null}
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
              <div
                key={p.id}
                className="relative overflow-hidden rounded-xl border bg-card"
              >
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
                <CardActionsMenu
                  itemName={p.name}
                  status={p.status}
                  editHref={`/dashboard/products/${p.id}/edit`}
                  viewHref={
                    p.status === "published" ? `/product/${p.slug}` : undefined
                  }
                  shareUrl={
                    p.status === "published" ? `/product/${p.slug}` : undefined
                  }
                  canDelete={p.status === "archived"}
                  onDelete={() => {
                    setSuccess(null);
                    setError(null);
                    setConfirmId(p.id);
                  }}
                  pinned={p.featured}
                  onTogglePin={() => togglePin(p.id, p.featured)}
                  pinning={pinningId === p.id}
                  onNotify={(message, kind) =>
                    kind === "error" ? setError(message) : setSuccess(message)
                  }
                />
                <div className="space-y-1 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    {p.featured ? (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        {t("featured")}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {p.price != null ? `${p.price} MAD` : "—"}
                    {p.stock === 0 ? ` · ${t("stockEmpty")}` : ` · ${p.stock}`}
                  </p>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {statusLabel(p.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <ConfirmDialog
        open={confirmId !== null}
        title={t("deleteTitle")}
        description={tActions("deleteConfirmation", { name: confirmName })}
        confirmLabel={t("delete")}
        cancelLabel={t("cancelDelete")}
        busy={confirmId !== null && busy === confirmId}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmId(null)}
      />
    </Card>
  );
}
