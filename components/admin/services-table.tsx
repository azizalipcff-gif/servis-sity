"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, X, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/smart-image";
import { localizedName, type Locale } from "@/lib/translations";
import { ServicePreviewDrawer } from "@/components/admin/service-preview-drawer";
import type { AdminService } from "@/lib/queries";

interface Props {
  services: AdminService[];
  locale: Locale;
}

export function ServicesTable({ services, locale }: Props) {
  const t = useTranslations("admin");
  const [rows, setRows] = useState<AdminService[]>(services);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ id: string; action?: "reject" } | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const dateFmt = (v: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(v));

  function update(id: string, patch: Partial<AdminService>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function applyStatus(s: AdminService, newStatus: string) {
    setBusyId(s.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/services?id=${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("failed");
      update(s.id, { status: newStatus } as Partial<AdminService>);
      setFeedback({ ok: true, message: newStatus === "published" ? t("approved") : t("rejected") });
    } catch {
      setFeedback({ ok: false, message: t("updateFailed") });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {feedback && (
        <div
          className={`mb-4 rounded-md px-3 py-2 text-sm ${
            feedback.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2">{t("image")}</th>
              <th className="px-3 py-2">{t("name")}</th>
              <th className="px-3 py-2">{t("category")}</th>
              <th className="px-3 py-2">{t("date")}</th>
              <th className="px-3 py-2 text-right">{t("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((s) => {
              const gallery = Array.isArray(s.gallery) ? s.gallery : [];
              const mainImage = (s.photo_url ? [s.photo_url, ...gallery] : gallery)[0] ?? "";
              const categoryName = s.category ? localizedName(s.category, locale) : null;
              const isPending = s.status === "pending";
              const disabled = busyId === s.id;
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="h-12 w-12 overflow-hidden rounded bg-gray-100">
                      {mainImage ? (
                        <SmartImage src={mainImage} alt={s.name} className="h-12 w-12" imgClassName="object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center text-gray-300">
                          <Eye className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{s.name}</div>
                    {s.business?.name && <div className="text-xs text-gray-500">{s.business.name}</div>}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{categoryName ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {s.updated_at ? dateFmt(s.updated_at) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreview({ id: s.id })}
                        aria-label={t("preview")}
                        title={t("preview")}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isPending && (
                        <>
                          <Button
                            size="sm"
                            disabled={disabled}
                            onClick={() => applyStatus(s, "published")}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="mr-1 h-4 w-4" />
                            {t("approve")}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={disabled}
                            onClick={() => setPreview({ id: s.id, action: "reject" })}
                          >
                            <X className="mr-1 h-4 w-4" />
                            {t("reject")}
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                  {t("empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {preview && (
        <ServicePreviewDrawer
          key={preview.id}
          open
          serviceId={preview.id}
          fallbackName={rows.find((r) => r.id === preview.id)?.name ?? ""}
          locale={locale}
          initialAction={preview.action}
          onClose={() => setPreview(null)}
          onModerated={(id, newStatus) => update(id, { status: newStatus } as Partial<AdminService>)}
        />
      )}
    </div>
  );
}
