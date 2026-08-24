"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { formatPrice, type Locale } from "@/lib/translations";
import type { BusinessDetail } from "@/lib/queries";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ServiceRow = NonNullable<BusinessDetail["services"]>[number];

function discountPercent(price: number | null, oldPrice: number | null): number | null {
  if (price == null || oldPrice == null) return null;
  if (oldPrice <= 0 || oldPrice <= price) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

export function ServicesManager({ business }: { business: BusinessDetail }) {
  const t = useTranslations("dashboard");
  const tBusiness = useTranslations("business");
  const locale = useLocale() as Locale;

  const router = useRouter();
  const [services, setServices] = useState<ServiceRow[]>(business.services ?? []);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function confirmDelete() {
    const id = confirmId;
    if (!id) return;
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/services/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setServices((prev) => prev.filter((s) => s.id !== id));
        setSuccess(t("deleteServiceSuccess"));
        router.refresh();
      } else {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(mapError(data?.error));
      }
    } catch {
      setError(t("deleteServiceError"));
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  function mapError(code?: string): string {
    if (code === "not_archived") return t("deleteServiceNotArchived");
    return t("deleteServiceError");
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>{t("services")}</CardTitle>
          <CardDescription>
            {services.length === 0 ? t("servicesEmpty") : `${services.length}`}
          </CardDescription>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/services/new">
            <Plus className="size-4" />
            {t("addService")}
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
        {services.length === 0 ? (
          <EmptyState
            icon={<Plus className="size-5" />}
            title={t("services")}
            description={t("servicesEmpty")}
          />
        ) : (
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
                    <Button variant="default" size="sm" asChild>
                      <Link href={`/dashboard/services/${service.id}/edit`}>
                        <Pencil className="size-4" />
                        {t("editService")}
                      </Link>
                    </Button>
                    {service.status === "archived" ? (
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => {
                          setSuccess(null);
                          setError(null);
                          setConfirmId(service.id);
                        }}
                        disabled={deletingId === service.id}
                        aria-label={t("deleteService")}
                      >
                        {deletingId === service.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <ConfirmDialog
        open={confirmId !== null}
        title={t("deleteServiceTitle")}
        description={t("deleteServiceDescription")}
        confirmLabel={t("deleteService")}
        cancelLabel={t("cancelDelete")}
        busy={confirmId !== null && deletingId === confirmId}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmId(null)}
      />
    </Card>
  );
}
