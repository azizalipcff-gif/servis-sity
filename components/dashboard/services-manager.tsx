"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { serviceSchema } from "@/lib/validations/schemas";
import { formatPrice, localizedName, type Locale } from "@/lib/translations";
import type { BusinessDetail } from "@/lib/queries";
import type { Category } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploadField } from "./image-upload";

type ServiceRow = NonNullable<BusinessDetail["services"]>[number];

function discountPercent(price: number | null, oldPrice: number | null): number | null {
  if (price == null || oldPrice == null) return null;
  if (oldPrice <= 0 || oldPrice <= price) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

export function ServicesManager({
  business,
  categories,
  ownerId,
}: {
  business: BusinessDetail | null;
  categories: Category[];
  ownerId: string;
}) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tBusiness = useTranslations("business");
  const locale = useLocale() as Locale;

  const [services, setServices] = useState<ServiceRow[]>(business?.services ?? []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!business) return null;

  const businessId = business.id;

  function resetForm() {
    setEditingId(null);
    setName("");
    setCategoryId("");
    setPrice("");
    setOldPrice("");
    setDuration("");
    setTagsText("");
    setImageUrl("");
    setError(null);
  }

  function startEdit(service: ServiceRow) {
    setEditingId(service.id);
    setName(service.name);
    setCategoryId(service.category_id ?? "");
    setPrice(service.price?.toString() ?? "");
    setOldPrice(service.old_price?.toString() ?? "");
    setDuration(service.duration_minutes?.toString() ?? "");
    setTagsText((service.tags ?? []).join(", "));
    setImageUrl(service.photo_url ?? "");
  }

  function parseTags(text: string): string[] {
    return Array.from(
      new Set(
        text
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 10),
      ),
    ).slice(0, 10);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = serviceSchema.safeParse({
      name,
      category_id: categoryId || null,
      price: price === "" ? null : Number(price),
      old_price: oldPrice === "" ? null : Number(oldPrice),
      duration_minutes: duration === "" ? null : Number(duration),
      tags: parseTags(tagsText),
      image_url: imageUrl || null,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(
        issue?.path[0] === "old_price" ? t("oldPriceError") : tCommon("error"),
      );
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const payload = {
        name: parsed.data.name,
        category_id: parsed.data.category_id ?? null,
        price: parsed.data.price ?? null,
        old_price: parsed.data.old_price ?? null,
        duration_minutes: parsed.data.duration_minutes ?? null,
        tags: parsed.data.tags ?? [],
        photo_url: parsed.data.image_url || null,
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from("services")
          .update(payload)
          .eq("id", editingId);
        if (updateError) {
          setError(tCommon("error"));
          return;
        }
        setServices((prev) =>
          prev.map((s) => (s.id === editingId ? { ...s, ...payload } : s)),
        );
      } else {
        const { data, error: insertError } = await supabase
          .from("services")
          .insert({ ...payload, business_id: businessId })
          .select(
            "id, business_id, name, price, category_id, tags, old_price, duration_minutes, description, photo_url, status, gallery, featured, updated_at",
          )
          .single();

        if (insertError || !data) {
          setError(tCommon("error"));
          return;
        }
        setServices((prev) => [...prev, data as ServiceRow]);
      }

      resetForm();
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (!error) {
      setServices((prev) => prev.filter((s) => s.id !== id));
      if (editingId === id) resetForm();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("services")}</CardTitle>
        <CardDescription>
          {services.length === 0 ? t("servicesEmpty") : `${services.length}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="mb-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("serviceName")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("serviceNamePlaceholder")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t("serviceCategory")}</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {localizedName(c, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("servicePrice")}</Label>
              <Input
                type="number"
                min={0}
                dir="ltr"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("serviceOldPrice")}</Label>
              <Input
                type="number"
                min={0}
                dir="ltr"
                value={oldPrice}
                onChange={(e) => setOldPrice(e.target.value)}
                placeholder={t("serviceOldPricePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("serviceDuration")}</Label>
              <Input
                type="number"
                min={0}
                dir="ltr"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("serviceTags")}</Label>
            <Input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder={t("serviceTagsPlaceholder")}
            />
          </div>

          <ImageUploadField
            label={t("serviceImage")}
            hint={t("uploadHint")}
            userId={ownerId}
            bucket="business-gallery"
            value={imageUrl}
            onChange={setImageUrl}
          />

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {editingId ? (
                <>
                  <Pencil className="size-4" />
                  {t("saveService")}
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  {t("addService")}
                </>
              )}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" onClick={resetForm}>
                {tCommon("cancel")}
              </Button>
            )}
          </div>
        </form>

        {services.length > 0 && (
          <ul className="divide-y">
            {services.map((service) => {
              const percent = discountPercent(service.price, service.old_price);
              return (
                <li
                  key={service.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {service.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={service.photo_url}
                        alt=""
                        className="size-11 shrink-0 rounded-md object-cover"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="font-medium">{service.name}</p>
                      <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {service.price != null
                            ? formatPrice(service.price, locale)
                            : "—"}
                          {percent != null && (
                            <Badge className="bg-destructive/10 text-destructive">
                              -{percent}%
                            </Badge>
                          )}
                        </span>
                        {service.old_price != null &&
                          service.old_price > 0 &&
                          service.old_price > (service.price ?? 0) && (
                            <s className="text-xs">
                              {formatPrice(service.old_price, locale)}
                            </s>
                          )}
                        {service.duration_minutes != null &&
                          ` · ${service.duration_minutes} ${tBusiness("minutes")}`}
                      </p>
                      {service.tags && service.tags.length > 0 && (
                        <p className="mt-1 flex flex-wrap gap-1">
                          {service.tags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="iconSm"
                      onClick={() => startEdit(service)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      onClick={() => handleDelete(service.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}