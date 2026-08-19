"use client";

import { useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import type { Product, Category } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { uploadImage, deleteStoredUrl } from "@/lib/uploads";
import { slugify } from "@/lib/slug";
import { localizedName, type Locale } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  businessId: string;
  ownerId: string;
  categories: Category[];
  initial?: Product | null;
  successHref?: string;
};

const STATUSES = ["draft", "published", "archived"] as const;

export function ProductForm({
  businessId,
  ownerId,
  categories,
  initial = null,
  successHref,
}: Props) {
  const t = useTranslations("products");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    category_id: initial?.category_id ?? "",
    price: initial?.price?.toString() ?? "",
    compare_at_price: initial?.compare_at_price?.toString() ?? "",
    stock: initial?.stock?.toString() ?? "",
    status: (initial?.status as Product["status"]) ?? "draft",
    description: initial?.description ?? "",
    featured: initial?.featured ?? false,
  });
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const fileRef = useRef<HTMLInputElement>(null);

  function patch<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const result = await uploadImage({ bucket: "business-gallery", ownerId, file });
    if (result.ok) setImages((prev) => [...prev, result.url]);
    else setError(tCommon("error"));
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleRemoveImage(url: string) {
    const result = await deleteStoredUrl(url);
    if (result.ok) {
      setImages((prev) => prev.filter((u) => u !== url));
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const name = form.name.trim();
    if (!name) return;

    const payload = {
      name,
      category_id: form.category_id || null,
      description: form.description.trim() || null,
      price: Number(form.price) || 0,
      compare_at_price: form.compare_at_price === "" ? null : Number(form.compare_at_price),
      stock: Number(form.stock) || 0,
      status: form.status,
      featured: form.featured,
      images,
    };

    setBusy(true);
    const supabase = createClient();
    try {
      if (initial) {
        const { error } = await supabase
          .from("products")
          .update({ ...payload, slug: slugify(name) })
          .eq("id", initial.id);
        if (error) {
          setError(tCommon("error"));
          return;
        }
      } else {
        const { error } = await supabase.from("products").insert({
          ...payload,
          slug: slugify(name),
          currency: "MAD",
          business_id: businessId,
        });
        if (error) {
          setError(tCommon("error"));
          return;
        }
      }

      setSaved(true);
      router.refresh();
      if (successHref) router.push(successHref);
    } catch {
      setError(tCommon("error"));
    } finally {
      setBusy(false);
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
      <CardHeader>
        <CardTitle>{initial ? t("edit") : t("add")}</CardTitle>
        {initial && initial.name ? <CardDescription>{initial.name}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("name")}</Label>
              <Input
                value={form.name}
                onChange={(e) => patch("name", e.target.value)}
                placeholder={t("namePlaceholder")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t("price")}</Label>
              <Input
                type="number"
                min={0}
                dir="ltr"
                value={form.price}
                onChange={(e) => patch("price", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("compareAtPrice")}</Label>
              <Input
                type="number"
                min={0}
                dir="ltr"
                value={form.compare_at_price}
                onChange={(e) => patch("compare_at_price", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("stock")}</Label>
              <Input
                type="number"
                min={0}
                dir="ltr"
                value={form.stock}
                onChange={(e) => patch("stock", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("status")}</Label>
              <select
                value={form.status}
                onChange={(e) => patch("status", e.target.value as Product["status"])}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("category")}</Label>
              <select
                value={form.category_id}
                onChange={(e) => patch("category_id", e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {localizedName(c, locale)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t("description")}</Label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => patch("description", e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("images")}</Label>
            <div className="flex flex-wrap gap-2">
              {images.map((url) => (
                <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  <button
                    type="button"
                    aria-label="remove"
                    onClick={() => handleRemoveImage(url)}
                    className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background/80 text-foreground hover:bg-background"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleImage(e.target.files?.[0])}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t("imagesHint")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => patch("featured", e.target.checked)}
                className="h-4 w-4"
              />
              {t("featured")}
            </label>
            <div className="ms-auto">
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {initial ? (
                  <>
                    <Pencil className="h-4 w-4" />
                    {t("edit")}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    {t("add")}
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {saved && (
            <p className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
              <CheckCircle2 className="size-4" />
              {t("saved")}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}