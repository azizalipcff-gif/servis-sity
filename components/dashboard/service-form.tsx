"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { CheckCircle2, Loader2, Pencil, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { serviceSchema } from "@/lib/validations/schemas";
import { localizedName, type Locale } from "@/lib/translations";
import type { BusinessDetail } from "@/lib/queries";
import type { Category } from "@/lib/supabase/database.types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploadField } from "./image-upload";

type ServiceRow = NonNullable<BusinessDetail["services"]>[number];

const SERVICE_STATUSES = ["draft", "published", "archived"] as const;
type ServiceStatus = (typeof SERVICE_STATUSES)[number];

type Props = {
  businessId: string;
  ownerId: string;
  categories: Category[];
  initial?: ServiceRow | null;
  successHref?: string;
};

export function ServiceForm({
  businessId,
  ownerId,
  categories,
  initial = null,
  successHref,
}: Props) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tProducts = useTranslations("products");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [name, setName] = useState(initial?.name ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [oldPrice, setOldPrice] = useState(initial?.old_price?.toString() ?? "");
  const [duration, setDuration] = useState(initial?.duration_minutes?.toString() ?? "");
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [imageUrl, setImageUrl] = useState(initial?.photo_url ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<ServiceStatus>(
    (SERVICE_STATUSES as readonly string[]).includes(initial?.status ?? "")
      ? (initial?.status as ServiceStatus)
      : "published",
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

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
    setSaved(false);

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
        description: description.trim() || null,
        status,
      };

      if (initial) {
        const { error: updateError } = await supabase
          .from("services")
          .update(payload)
          .eq("id", initial.id);
        if (updateError) {
          setError(tCommon("error"));
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from("services")
          .insert({ ...payload, business_id: businessId });
        if (insertError) {
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
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initial ? t("editService") : t("addService")}</CardTitle>
        {initial && initial.name ? (
          <CardDescription>{initial.name}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
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

          <div className="grid gap-4 md:grid-cols-4">
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
            <div className="space-y-2">
              <Label>{t("serviceStatus")}</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ServiceStatus)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
              >
                {SERVICE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "published"
                      ? tProducts("statusPublished")
                      : s === "archived"
                        ? tProducts("statusArchived")
                        : tProducts("statusDraft")}
                  </option>
                ))}
              </select>
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

          <div className="space-y-2">
            <Label>{t("serviceDescription")}</Label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("serviceDescriptionPlaceholder")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
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

          {saved && (
            <p className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
              <CheckCircle2 className="size-4" />
              {t("savedService")}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {initial ? (
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
          </div>
        </form>
      </CardContent>
    </Card>
  );
}