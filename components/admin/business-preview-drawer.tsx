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
  Globe,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  X,
  XCircle,
  MessageCircle,
} from "lucide-react";
import type { Locale } from "@/lib/translations";
import { localizedName } from "@/lib/translations";
import type { BusinessStatus } from "@/lib/supabase/database.types";
import { SmartImage } from "@/components/smart-image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export type BusinessPreview = {
  business: {
    id: string;
    name: string;
    status: BusinessStatus;
    status_note: string | null;
    description: string | null;
    city: string | null;
    address: string | null;
    phone: string | null;
    whatsapp: string | null;
    website: string | null;
    facebook: string | null;
    instagram: string | null;
    tiktok: string | null;
    linkedin: string | null;
    slug: string;
    tags: string | null;
    keywords: string | null;
    logo_url: string | null;
    cover_url: string | null;
    created_at: string;
    verified_at: string | null;
    categories: {
      name_ar: string;
      name_fr: string;
      name_en: string;
    } | null;
  };
  owner: {
    full_name: string | null;
    phone: string | null;
    city: string | null;
    website: string | null;
    avatar_url: string | null;
  } | null;
  services: {
    id: string;
    name: string;
    description: string | null;
    price: number | null;
    duration_minutes: number | null;
    photo_url: string | null;
    gallery: string[];
    status: string;
  }[];
  hours: {
    id: string;
    day_of_week: number;
    open_time: string | null;
    close_time: string | null;
    is_closed: boolean;
  }[];
  media: { id: string; url: string }[];
  audit: {
    id: string;
    action: string;
    metadata: {
      from?: string;
      to?: string;
      note?: string;
      plan?: string;
      verification_status?: string;
    } | null;
    created_at: string;
    actor: string | null;
    isModeration: boolean;
  }[];
};

type Props = {
  businessId: string;
  fallbackName: string;
  open: boolean;
  locale: Locale;
  onClose: () => void;
  onModerated: (id: string, status: BusinessStatus, note?: string | null) => void;
  initialAction?: "reject";
};

const REJECT_REASONS = [
  "reasonIncomplete",
  "reasonInvalidContact",
  "reasonPoorImages",
  "reasonDuplicate",
  "reasonWrongCategory",
  "reasonWrongLocation",
  "reasonProhibited",
  "reasonOther",
] as const;

function StatusBadge({ status }: { status: BusinessStatus }) {
  const t = useTranslations("admin");
  const map: Record<BusinessStatus, "default" | "success" | "warning" | "destructive"> = {
    approved: "success",
    pending_review: "warning",
    rejected: "destructive",
    suspended: "destructive",
  };
  return <Badge variant={map[status]}>{t(status)}</Badge>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </section>
  );
}

function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | null | undefined;
  href?: string | null;
}) {
  if (!value) return null;
  const content = (
    <>
      {icon}
      <span className="min-w-0 break-words">
        <span className="mr-1 text-muted-foreground">{label}:</span>
        {value}
      </span>
    </>
  );
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      dir="ltr"
      className="flex items-center gap-2 text-sm text-primary hover:underline"
    >
      {content}
    </a>
  ) : (
    <p className="flex items-center gap-2 text-sm">{content}</p>
  );
}

export function BusinessPreviewDrawer({
  businessId,
  fallbackName,
  open,
  locale,
  onClose,
  onModerated,
  initialAction,
}: Props) {
  const t = useTranslations("admin");
  const [data, setData] = useState<BusinessPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(initialAction === "reject");
  const [reason, setReason] = useState<string>(REJECT_REASONS[0]);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    if (!open || !businessId) return;
    setLoading(true);
    setReason(REJECT_REASONS[0]);
    try {
      const res = await fetch(`/api/admin/businesses/preview?id=${encodeURIComponent(businessId)}`);
      if (res.ok) {
        const json = await res.json();
        setData(json as BusinessPreview);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [open, businessId]);

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

  async function moderate(status: BusinessStatus, statusNote?: string | null) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/businesses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: businessId, status, status_note: statusNote }),
      });
      if (!res.ok) return;
      setData((prev) => (prev ? { ...prev, business: { ...prev.business, status, status_note: statusNote ?? null } } : prev));
      setRejectOpen(false);
      setNote("");
      onModerated(businessId, status);
      void load();
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const images = data
    ? [
        ...(data.business.cover_url ? [data.business.cover_url] : []),
        ...(data.business.logo_url ? [data.business.logo_url] : []),
        ...data.media.map((m) => m.url),
        ...data.services.flatMap((s) =>
          [s.photo_url, ...(s.gallery ?? [])].filter((x): x is string => Boolean(x)),
        ),
      ]
    : [];

  const lastModeration = data?.audit.find((a) => a.isModeration) ?? null;
  const reviewedDate =
    lastModeration?.created_at ?? data?.business.verified_at ?? null;

  const weekday = (dow: number) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : locale, { weekday: "long" }).format(
      new Date(Date.UTC(2024, 0, 7 + dow)),
    );

  const dateFmt = (v: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(v));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        className="fixed inset-y-0 end-0 z-50 flex w-full max-w-2xl flex-col border-s bg-background shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {data ? (
              <div className="size-11 shrink-0 overflow-hidden rounded-xl border bg-muted">
                <SmartImage
                  src={data.business.logo_url}
                  alt={data.business.name}
                  className="size-full"
                  imgClassName="object-cover"
                />
              </div>
            ) : (
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted">
                <Eye className="size-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{data?.business.name ?? fallbackName}</h3>
              {data && <StatusBadge status={data.business.status} />}
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
          {loading || !data ? (
            <div className="space-y-4">
              <Skeleton className="h-52 w-full rounded-2xl" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Visual */}
              <section>
                {data.business.cover_url ? (
                  <button
                    type="button"
                    onClick={() => setLightbox(data.business.cover_url!)}
                    className="relative block h-52 w-full overflow-hidden rounded-2xl border bg-muted"
                  >
                    <SmartImage
                      src={data.business.cover_url}
                      alt={data.business.name}
                      className="h-full w-full"
                      imgClassName="object-cover"
                    />
                  </button>
                ) : (
                  <div className="grid h-52 w-full place-items-center rounded-2xl border border-dashed bg-muted/50 text-sm text-muted-foreground">
                    {t("noCover")}
                  </div>
                )}

                {images.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {images.slice(0, 6).map((src, i) => (
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
                    {t("created")}: {dateFmt(data.business.created_at)}
                  </p>
                  <p className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-muted-foreground" />
                    {t("status")}: {t(data.business.status)}
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
                  {data.business.status_note && (
                    <p className="flex items-start gap-2 sm:col-span-2">
                      <Ban className="mt-0.5 size-4 shrink-0 text-destructive" />
                      <span>
                        <span className="font-medium text-destructive">{t("rejectionReason")}:</span>{" "}
                        {data.business.status_note}
                      </span>
                    </p>
                  )}
                </div>
              </Section>

              {/* Business info */}
              <Section title={t("businessInfo")}>
                <div className="space-y-2">
                  <InfoRow value={data.business.description} label={t("description")} />
                  <InfoRow
                    value={data.business.categories ? localizedName(data.business.categories, locale) : null}
                    label={t("category")}
                  />
                  <InfoRow icon={<MapPin className="size-4" />} value={data.business.city} label={t("city")} />
                  <InfoRow value={data.business.address} label={t("address")} />
                  <InfoRow
                    icon={<Phone className="size-4" />}
                    value={data.business.phone}
                    label={t("phone")}
                    href={data.business.phone ? `tel:${data.business.phone}` : undefined}
                  />
                  <InfoRow
                    icon={<MessageCircle className="size-4" />}
                    value={data.business.whatsapp}
                    label={t("whatsapp")}
                    href={data.business.whatsapp ? `https://wa.me/${data.business.whatsapp.replace(/[^0-9+]/g, "")}` : undefined}
                  />
                  <InfoRow
                    icon={<Globe className="size-4" />}
                    value={data.business.website}
                    label={t("website")}
                    href={data.business.website}
                  />
                  {(data.business.facebook ||
                    data.business.instagram ||
                    data.business.tiktok ||
                    data.business.linkedin) && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[data.business.facebook, data.business.instagram, data.business.tiktok, data.business.linkedin]
                        .filter(Boolean)
                        .map((url) => (
                          <a
                            key={url}
                            href={url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            {t("social")}
                          </a>
                        ))}
                    </div>
                  )}
                </div>
              </Section>

              {/* Opening hours */}
              {data.hours.length > 0 && (
                <Section title={t("openingHours")}>
                  <div className="space-y-1 rounded-xl border bg-muted/30 p-3 text-sm">
                    {data.hours.map((h) => (
                      <div key={h.id} className="flex items-center justify-between gap-4">
                        <span className="font-medium">{weekday(h.day_of_week)}</span>
                        {h.is_closed ? (
                          <span className="text-muted-foreground">{t("closed")}</span>
                        ) : (
                          <span dir="ltr">
                            {h.open_time?.slice(0, 5) ?? "—"} – {h.close_time?.slice(0, 5) ?? "—"}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Services */}
              <Section title={t("services")}>
                {data.services.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("noServices")}</p>
                ) : (
                  <div className="space-y-2">
                    {data.services.map((s) => (
                      <div key={s.id} className="rounded-xl border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium">{s.name}</p>
                            {s.description && (
                              <p className="mt-0.5 text-sm text-muted-foreground">{s.description}</p>
                            )}
                          </div>
                          <div className="shrink-0 text-end">
                            {s.price != null && (
                              <p className="font-semibold">
                                {new Intl.NumberFormat(locale === "ar" ? "ar-MA" : locale, {
                                  style: "currency",
                                  currency: "MAD",
                                }).format(s.price)}
                              </p>
                            )}
                            {s.duration_minutes != null && (
                              <p className="text-xs text-muted-foreground">
                                {s.duration_minutes} {t("minutes")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* SEO */}
              <Section title={t("seo")}>
                <div className="space-y-1.5 rounded-xl border bg-muted/30 p-3 text-sm">
                  <InfoRow value={data.business.slug} label={t("slug")} />
                  <InfoRow value={data.business.tags} label={t("tags")} />
                  <InfoRow value={data.business.keywords} label={t("keywords")} />
                </div>
              </Section>

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
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => setRejectOpen(false)}
                >
                  {t("cancel")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy || (!note.trim() && reason === "reasonOther")}
                  onClick={() =>
                    void moderate(
                      "rejected",
                      reason === "reasonOther" ? note.trim() || null : t(reason),
                    )
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
              {data?.business.status !== "approved" && (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void moderate("approved")}
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  <BadgeCheck className="size-4" />
                  {t("approve")}
                </Button>
              )}
              {data?.business.status !== "rejected" && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => setRejectOpen(true)}
                >
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

      {/* Lightbox */}
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