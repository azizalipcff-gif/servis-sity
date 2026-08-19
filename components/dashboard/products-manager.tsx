"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { Product } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { deleteStoredUrl } from "@/lib/uploads";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  businessId: string;
  initial?: Product[];
};

export function ProductsManager({
  businessId,
  initial = [],
}: Props) {
  const t = useTranslations("products");

  const [products, setProducts] = useState<Product[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function handleDelete(id: string, images: string[]) {
    if (!confirm(t("confirmDelete"))) return;
    setBusy(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);
    if (!error) {
      await Promise.all(images.map((u) => deleteStoredUrl(u)));
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
    setBusy(null);
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
                    <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
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
                      <Button variant="ghost" size="iconSm" asChild aria-label={t("edit")}>
                        <Link href={`/dashboard/products/${p.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        disabled={busy === p.id}
                        onClick={() => handleDelete(p.id, p.images ?? [])}
                      >
                        {busy === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}