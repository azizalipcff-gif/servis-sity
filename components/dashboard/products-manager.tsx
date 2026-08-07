"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Loader2,
  Pencil,
  Plus,
  X,
  Trash2,
} from "lucide-react";
import type { Product } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/uploads";
import { slugify } from "@/lib/slug";
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

type Props = { businessId: string; ownerId: string; initial?: Product[] };

const STATUSES = ["draft", "published", "archived"] as const;

export function ProductsManager({
  businessId,
  ownerId,
  initial = [],
}: Props) {
  const t = useTranslations("products");
  const tCommon = useTranslations("common");

  const [products, setProducts] = useState<Product[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    price: "",
    compare_at_price: "",
    stock: "",
    status: "draft" as Product["status"],
    description: "",
    featured: false,
  });
  const [images, setImages] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setEditingId(null);
    setForm({
      name: "",
      price: "",
      compare_at_price: "",
      stock: "",
      status: "draft",
      description: "",
      featured: false,
    });
    setImages([]);
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      price: product.price?.toString() ?? "",
      compare_at_price: product.compare_at_price?.toString() ?? "",
      stock: product.stock?.toString() ?? "",
      status: (product.status as Product["status"]) ?? "draft",
      description: product.description ?? "",
      featured: product.featured,
    });
    setImages(product.images ?? []);
  }

  function patch<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const result = await uploadImage({ bucket: "business-gallery", ownerId, file });
    if (result.ok) setImages((prev) => [...prev, result.url]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;

    const payload = {
      name,
      description: form.description.trim() || null,
      price: Number(form.price) || 0,
      compare_at_price: form.compare_at_price === "" ? null : Number(form.compare_at_price),
      stock: Number(form.stock) || 0,
      status: form.status,
      featured: form.featured,
      images,
      slug: "",
    };

    setBusy(editingId ?? "new");
    const supabase = createClient();
    if (editingId) {
      payload.slug = slugify(name);
      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", editingId);
      if (!error) {
        setProducts((prev) => prev.map((p) => (p.id === editingId ? { ...p, ...payload } : p)));
        resetForm();
      }
    } else {
      const slug = slugify(name);
      const { data, error } = await supabase
        .from("products")
        .insert({
          ...payload,
          slug,
          currency: "MAD",
          business_id: businessId,
        })
        .select("*")
        .single();
      if (!error && data) {
        setProducts((prev) => [data as Product, ...prev]);
        resetForm();
      }
    }
    setBusy(null);
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    const supabase = createClient();
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      if (editingId === id) resetForm();
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
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {products.length === 0 ? t("empty") : `${products.length} products`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="mb-6 space-y-4 rounded-xl border bg-background/40 p-4">
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
              <Label>{t("description")}</Label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => patch("description", e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Images */}
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
                    onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
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
            <div className="ms-auto flex gap-2">
              <Button type="submit" disabled={busy !== null}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? (
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
              {editingId && (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  {tCommon("cancel")}
                </Button>
              )}
            </div>
          </div>
        </form>

        {products.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t("empty")} — {t("addHint")}
          </p>
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
                      <Button variant="ghost" size="iconSm" onClick={() => startEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        disabled={busy === p.id}
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
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