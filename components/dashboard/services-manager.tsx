"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { serviceSchema } from "@/lib/validations/schemas";
import { formatPrice } from "@/lib/translations";
import type { BusinessDetail } from "@/lib/queries";
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

type ServiceRow = NonNullable<BusinessDetail["services"]>[number];

export function ServicesManager({ business }: { business: BusinessDetail | null }) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tBusiness = useTranslations("business");
  const locale = useLocale() as "ar" | "fr" | "en";

  const [services, setServices] = useState<ServiceRow[]>(business?.services ?? []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!business) return null;

  const businessId = business.id;

  function resetForm() {
    setEditingId(null);
    setName("");
    setPrice("");
    setDuration("");
    setError(null);
  }

  function startEdit(service: ServiceRow) {
    setEditingId(service.id);
    setName(service.name);
    setPrice(service.price?.toString() ?? "");
    setDuration(service.duration_minutes?.toString() ?? "");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = serviceSchema.safeParse({
      name,
      price: price === "" ? null : Number(price),
      duration_minutes: duration === "" ? null : Number(duration),
    });

    if (!parsed.success) {
      setError(tCommon("error"));
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const payload = {
        name: parsed.data.name,
        price: parsed.data.price ?? null,
        duration_minutes: parsed.data.duration_minutes ?? null,
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
          .select("id, business_id, name, price, duration_minutes")
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
        <form onSubmit={handleSave} className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="space-y-2 md:col-span-2">
            <Label>{t("serviceName")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("serviceNamePlaceholder")}
              required
            />
          </div>
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
            <Label>{t("serviceDuration")}</Label>
            <Input
              type="number"
              min={0}
              dir="ltr"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive md:col-span-4">
              {error}
            </p>
          )}

          <div className="flex gap-2 md:col-span-4">
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
            {services.map((service) => (
              <li
                key={service.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div>
                  <p className="font-medium">{service.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {service.price != null ? formatPrice(service.price, locale) : "—"}
                    {service.duration_minutes != null &&
                      ` · ${service.duration_minutes} ${tBusiness("minutes")}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
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
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
