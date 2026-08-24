"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  BadgeCheck,
  Ban,
  CalendarDays,
  Check,
  Clock,
  Eye,
  Loader2,
  MapPin,
  ShieldCheck,
  User,
  X,
  XCircle,
} from "lucide-react";

import { localizedName, type Locale } from "@/lib/translations";
import type { Category } from "@/lib/supabase/database.types";
import { SmartImage } from "@/components/smart-image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type ProductPreview = {
  product: {
    id: string;
    name: string;
    status: string;
    status_note: string | null;
    description: string | null;
    images: string[] | null;
    price: number | null;
    compare_at_price: number | null;
    stock: number | null;
    sku: string | null;
    currency: string | null;
    slug: string | null;
    tags: string[] | null;
    created_at: string;
    category: Pick<Category, "name_ar" | "name_fr" | "name_en"> | null;
  };
  business: { id: string; name: string | null; slug: string | null; city: string | null } | null;
  owner: {
    full_name: string | null;
    phone: string | null;
    city: string | null;
    website: string | null;
    avatar_url: string | null;
  } | null;
  audit: {
    id: string;
    action: string;
    metadata: { from?: string; to?: string; note?: string } | null;
    created_at: string;
    actor: string | null;
    isModeration: boolean;
  }[];
};

const REJECT_REASONS = [
  "reasonIncomplete",
  "reasonInvalidContact",
  "reasonPoorImages",
  "reasonDuplicate",
  "reasonWrongCategory",
  "reasonProhibited",
  "reasonOther",
] as const;

function statusLabel(t: (k: string) => string, status: string): string {
  switch (status) {
    case "pending":
      return t("pending_review");
    case "published":
      return t("approved");
    case "rejected":
      return t("rejected");
    case "draft":
      return t("statusDraft");
    case "archived":
      return t("statusArchived");
    default:
      return status;
  }
}

function StatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  const map: Record<string, "default" | "success" | "warning" | "destructive"> = {
    pending: "warning",
    published: "success",
    rejected: "destructive",
    draft: "default",
    archived: "default",
  };
  return <Badge variant={map[status] ?? "default"}>{statusLabel(t, status)}</Badge>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <p className="flex items-start gap-2 text-sm">
      <span className="min-w-0 break-words">
        <span className="mr-1 text-muted-foreground">{label}:</span>
        {value}
      </span>
    </p>
  );
}

export function ProductPreviewDrawer({
  productId,
  fallbackName,
  open,
  locale,
  onClose,
  onModerated,
  initialAction,
}: {
  productId: string;
  fallbackName: string;
  open: boolean;
  locale: Locale;
  onClose: () => void;
  onModerated: (id: string, status: string) => void;
  initialAction?: "reject";
}) {
  const t = useTranslations("admin");
  const [data, setData] = useState<ProductPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(initialAction === "reject");
  const [reason, setReason] = useState<string>(REJECT_REASONS[0]);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    if (!open || !productId) return;
    setLoading(true);
    setReason(REJECT_REASONS[0]);
    try {
      const res = await fetch(`/api/admin/products/preview?id=${encodeURIComponent(productId)}`);
      if (res.ok) {
        const json = await res.json();
        setData(json as ProductPreview);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [open, productId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightbox) setLightbox(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, lightbox, onClose]);

  async function moderate(status: string, statusNote?: string | null) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products?id=${encodeURIComponent(productId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, status_note: statusNote ?? null }),
      });
      if (!res.ok) {
        setError(t("updateFailed"));
        return;
      }
      setData((prev) =>
        prev ? { ...prev, product: { ...prev.product, status, status_note: statusNote ?? null } } : prev,
      );
      setRejectOpen(false);
      setNote("");
      onModerated(productId, status);
      void load();
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const images = data?.product.images ?? [];
  const mainImage = images[0] ?? "";
  const lastModeration = data?.audit.find((a) => a.isModeration) ?? null;
  const reviewedDate = lastModeration?.created_at ?? null;

  const dateFmt = (v: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(v));

  const priceFmt = (v: number) =>
    new Intl.NumberFormat(locale === "ar" ? "ar-MA" : locale, {
      style: "currency",
      currency: data?.product.currency ?? "MAD",
    }).format(v);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="fixed inset-y-0 end-0 z-50 flex w-full max-w-2xl flex-col border-s bg-background shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{data?.product.name ?? fallbackName}</h3>
              {data && <StatusBadge status={data.product.status} t={t} />}
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full hover:bg-muted"
            aria-label={t("close")}
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {loading || !data ? (
            <div className="space-y-4">
              <Skeleton className="h-52 w-full rounded-2xl" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Visual */}
              <section>
                {mainImage ? (
                  <button
                    type="button"
                    onClick={() => setLightbox(mainImage)}
                    className="relative block h-52 w-full overflow-hidden rounded-2xl border bg-muted"
                  >
                    <SmartImage src={mainImage} alt={data.product.name} className="h-full w-full" imgClassName="object-cover" />
                  </button>
                ) : (
                  <div className="grid h-52 w-full place-items-center rounded-2xl border border-dashed bg-muted/50 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Eye className="size-5" />
                      {t("noImage")}
                    </span>
                  </div>
                )}

                {images.length > 1 && (
                  <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {images.map((src, i) => (
                      <button
                        key={`${src}-${i}`}
                        type="button"
                        onClick={() => setLightbox(src)}
                        className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
                      >
                        <SmartImage src={src} alt="" className="h-full w-full" imgClassName="object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* Moderation */}
              <Section title={t("moderation")}>
                <div className="grid gap-2 rounded-xl border bg-muted/30 p-3 text-sm sm:grid-cols-2">
                  <p className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-muted-foreground" />
                    {t("created")}: {dateFmt(data.product.created_at)}
                  </p>
                  <p className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-muted-foreground" />
                    {t("status")}: {statusLabel(t, data.product.status)}
                  </p>
                  {reviewedDate && (
                    <p className="flex items-center gap-2">
                      <Clock className="size-4 text-muted-foreground" />
                      {t("reviewedAt")}: {dateFmt(reviewedDate)}
                    </p>
                  )}
                  {lastModeration?.actor && (
                    <p className="flex items-center gap-2">
                      <User className="size-4 text-muted-foreground" />
                      {t("reviewedBy")}: {lastModeration.actor}
                    </p>
                  )}
                  {data.product.status_note && (
                    <p className="flex items-start gap-2 sm:col-span-2">
                      <Ban className="mt-0.5 size-4 shrink-0 text-destructive" />
                      <span>
                        <span className="font-medium text-destructive">{t("rejectionReason")}:</span>{" "}
                        {data.product.status_note}
                      </span>
                    </p>
                  )}
                </div>
              </Section>

              {/* Product info */}
              <Section title={t("productInfo")}>
                <div className="space-y-2">
                  <InfoRow value={data.product.description} label={t("description")} />
                  <InfoRow
                    value={data.product.category ? localizedName(data.product.category, locale) : null}
                    label={t("category")}
                  />
                  {data.product.price != null && (
                    <p className="flex items-center gap-2 text-sm">
                      <span className="mr-1 text-muted-foreground">{t("price")}:</span>
                      {priceFmt(data.product.price)}
                      {data.product.compare_at_price != null && (
                        <span className="text-muted-foreground line-through">
                          {priceFmt(data.product.compare_at_price)}
                        </span>
                      )}
                    </p>
                  )}
                  {data.product.stock != null && (
                    <InfoRow value={String(data.product.stock)} label={t("stock")} />
                  )}
                  {data.product.sku && <InfoRow value={data.product.sku} label={t("sku")} />}
                  {data.product.slug && <InfoRow value={data.product.slug} label={t("slug")} />}
                  {Array.isArray(data.product.tags) && data.product.tags.length > 0 && (
                    <InfoRow value={data.product.tags.join(", ")} label={t("tags")} />
                  )}
                </div>
              </Section>

              {/* Business */}
              {data.business && (
                <Section title={t("businessInfo")}>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{data.business.name}</p>
                    {data.business.city && (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="size-4" />
                        {data.business.city}
                      </p>
                    )}
                  </div>
                </Section>
              )}

              {/* Owner */}
              <Section title={t("owner")}>
                {data.owner ? (
                  <div className="flex items-center gap-3 rounded-xl border p-3">
                    <div className="size-12 shrink-0 overflow-hidden rounded-full border bg-muted">
                      <SmartImage
                        src={data.owner.avatar_url}
                        alt={(data.owner.full_name ?? "").split(" ")[0] || "owner"}
                        className="h-full w-full"
                        imgClassName="object-cover"
                      />
                    </div>
                    <div className="min-w-0 text-sm">
                      <p className="font-medium">{data.owner.full_name ?? "—"}</p>
                      {(data.owner.phone || data.owner.city || data.owner.website) && (
                        <p className="text-muted-foreground">
                          {[data.owner.phone, data.owner.city].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </Section>
            </div>
          )}
        </div>

        {/* Actions */}
        <footer className="border-t bg-card px-5 py-4">
          {rejectOpen ? (
            <div className="space-y-3">
              <div className="grid gap-1.5 sm:grid-cols-2">
                {REJECT_REASONS.map((r) => (
                  <label
                    key={r}
                    className={
                      "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm " +
                      (reason === r
                        ? "border-destructive/50 bg-destructive/5 text-destructive"
                        : "hover:bg-muted")
                    }
                  >
                    <input
                      type="radio"
                      name="reject-reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="accent-destructive"
                    />
                    {t(r)}
                  </label>
                ))}
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                placeholder={t("rejectNotePlaceholder")}
                rows={2}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => setRejectOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy || (!note.trim() && reason === "reasonOther")}
                  onClick={() =>
                    void moderate("archived", reason === "reasonOther" ? note.trim() || null : t(reason))
                  }
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  <XCircle className="size-4" />
                  {t("confirmReject")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {data?.product.status !== "published" && (
                <Button size="sm" disabled={busy} onClick={() => void moderate("published")}>
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  <BadgeCheck className="size-4" />
                  {t("approve")}
                </Button>
              )}
              {data?.product.status !== "archived" && (
                <Button size="sm" variant="destructive" disabled={busy} onClick={() => setRejectOpen(true)}>
                  <XCircle className="size-4" />
                  {t("reject")}
                </Button>
              )}
              <Button size="sm" variant="ghost" disabled={busy} onClick={onClose}>
                <Check className="size-4" />
                {t("done")}
              </Button>
            </div>
          )}
        </footer>
      </aside>

      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute end-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label={t("close")}
          >
            <X className="size-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            className="max-h-full max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
