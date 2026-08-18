"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  CloudUpload,
  ExternalLink,
  FileText,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  UploadCloud,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  uploadVerificationDoc,
  type VerificationDocField,
} from "@/lib/verification/docs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type DocValue = { path: string; name: string };

const FIELDS: {
  field: VerificationDocField;
  column: string;
  submitKey: "idDocumentUrl" | "activityDocumentUrl" | "licenseUrl" | "taxDocumentUrl";
  defKey: string;
}[] = [
  { field: "id_document", column: "id_document_url", submitKey: "idDocumentUrl", defKey: "docIdDef" },
  { field: "activity_document", column: "activity_document_url", submitKey: "activityDocumentUrl", defKey: "docActivityDef" },
  { field: "license", column: "license_url", submitKey: "licenseUrl", defKey: "docLicenseDef" },
  { field: "tax", column: "tax_document_url", submitKey: "taxDocumentUrl", defKey: "docTaxDef" },
];

type ExistingDoc = { url: string | null; key: string | null; path?: string | null };

export function VerificationPanel({
  businessId,
  userId,
  verificationStatus,
}: {
  businessId: string;
  userId: string;
  verificationStatus: string;
}) {
  const t = useTranslations("dashboard.dash");

  const [existing, setExisting] = useState<Record<string, ExistingDoc>>({});
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [docs, setDocs] = useState<Record<string, DocValue>>({});
  const [uploadingField, setUploadingField] = useState<VerificationDocField | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [dragOverField, setDragOverField] = useState<VerificationDocField | null>(null);
  const dragDepthRef = useRef<Partial<Record<VerificationDocField, number>>>({});

  const state = useMemo((): "none" | "pending" | "verified" | "rejected" => {
    if (requestStatus === "pending" || requestStatus === "verified" || requestStatus === "rejected") {
      return requestStatus;
    }
    if (
      verificationStatus === "verified" ||
      verificationStatus === "pending" ||
      verificationStatus === "rejected"
    ) {
      return verificationStatus;
    }
    return "none";
  }, [requestStatus, verificationStatus]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/verification/docs?business_id=${businessId}`);
      if (res.ok) {
        const data = (await res.json()) as {
          request?: Record<string, unknown> | null;
          docs?: Record<string, ExistingDoc>;
        };
        const request = data.request;
        if (request) {
          setRequestStatus((request.status as string) ?? null);
          setAdminNote((request.admin_note as string | null) ?? null);
          setNotes((request.notes as string) ?? "");
        }
        setExisting(data.docs ?? {});
      }
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleFile(field: VerificationDocField, file: File | undefined) {
    if (!file || !userId) return;
    setError(null);
    setUploadingField(field);
    try {
      const result = await uploadVerificationDoc(field, file, userId);
      if (!result.ok) {
        setError(tError(result.error));
        return;
      }
      setDocs((prev) => ({
        ...prev,
        [fieldColumn(field)]: { path: result.path, name: file.name },
      }));
    } finally {
      setUploadingField(null);
    }
  }

  function fieldColumn(field: VerificationDocField): string {
    return FIELDS.find((f) => f.field === field)?.column ?? field;
  }

  function removeDoc(field: VerificationDocField) {
    const column = fieldColumn(field);
    setDocs((prev) => {
      const next = { ...prev };
      delete next[column];
      return next;
    });
  }

  function handleDragOver(field: VerificationDocField, e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverField(field);
  }

  function handleDragEnter(field: VerificationDocField, e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    dragDepthRef.current[field] = (dragDepthRef.current[field] ?? 0) + 1;
    setDragOverField(field);
  }

  function handleDragLeave(field: VerificationDocField, e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    const next = Math.max((dragDepthRef.current[field] ?? 0) - 1, 0);
    dragDepthRef.current[field] = next;
    if (next === 0) setDragOverField(null);
  }

  function handleDrop(field: VerificationDocField, e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    dragDepthRef.current[field] = 0;
    setDragOverField(null);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(field, file);
  }

  function tError(code: string): string {
    const key =
      code === "too_large"
        ? "docTooLarge"
        : code === "bad_extension" || code === "bad_mime"
          ? "docBadType"
          : code === "upload_failed"
            ? "docUploadFailed"
            : null;
    return key ? t(key) : t("docUploadFailed");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const hasAnyDoc = FIELDS.some((f) => existing[f.column]?.url || docs[f.column]);
    if (!hasAnyDoc) {
      setError(t("docRequired"));
      return;
    }

    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        businessId,
        notes: notes.trim(),
      };
      for (const f of FIELDS) {
        const newDoc = docs[f.column];
        const existingDoc = existing[f.column];
        payload[f.submitKey] =
          newDoc?.path ?? (existingDoc?.path ? existingDoc.path : null);
      }
      const res = await fetch("/api/billing/verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        if (body?.error === "already_pending") setError(t("verificationPending"));
        else if (body?.error === "csrf_rejected") setError(t("csrfRejected"));
        else setError(t("submitFailed"));
        return;
      }
      setSaved(true);
      setRequestStatus("pending");
      await load();
    } catch {
      setError(t("submitFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-3xl border bg-card p-10 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  const statusConfig = {
    none: { class: "bg-muted text-muted-foreground", Icon: ShieldAlert, label: t("verificationNone") },
    pending: { class: "bg-warning/10 text-warning", Icon: Loader2, label: t("verificationPending") },
    verified: { class: "bg-success/10 text-success", Icon: CheckCircle2, label: t("verifiedBadge") },
    rejected: { class: "bg-destructive/10 text-destructive", Icon: ShieldX, label: t("verificationRejected") },
  } as const;
  const status = statusConfig[state];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border bg-card p-5">
        <div className="flex items-center gap-3">
          <span className={cn("grid size-12 place-items-center rounded-2xl", status.class)}>
            <status.Icon className="size-6" />
          </span>
          <div>
            <p className="font-semibold">{status.label}</p>
            <p className="text-sm text-muted-foreground">
              {state === "verified"
                ? t("verifiedHint")
                : state === "rejected"
                  ? adminNote || t("rejectedHint")
                  : state === "pending"
                    ? t("pendingHint")
                    : t("noneHint")}
            </p>
          </div>
        </div>
      </div>

      {(state === "none" || state === "rejected") && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-3xl border bg-card p-5">
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4" />
              {t("submitDocs")}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map((f) => {
                const uploaded = docs[f.column];
                const existingDoc = existing[f.column];
                const name = uploaded?.name ?? (existingDoc?.url ? f.field : "");
                const shownUrl = uploaded?.path ? null : existingDoc?.url;
                return (
                  <div key={f.field} className="space-y-2">
                    <Label>{t(f.defKey)}</Label>
                    {uploaded || existingDoc?.url ? (
                      <div className="flex items-center justify-between gap-2 rounded-md border p-2.5">
                        <span className="inline-flex min-w-0 items-center gap-2 text-xs">
                          <FileText className="size-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{name}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          {shownUrl && (
                            <Button
                              type="button"
                              size="iconSm"
                              variant="ghost"
                              asChild
                            >
                              <a href={shownUrl} target="_blank" rel="noopener noreferrer" aria-label={t("docPreview")}>
                                <ExternalLink className="size-4" />
                              </a>
                            </Button>
                          )}
                          {uploaded && (
                            <Button type="button" size="iconSm" variant="ghost" onClick={() => removeDoc(f.field)} aria-label={t("docRemove")}>
                              <X className="size-4" />
                            </Button>
                          )}
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => inputRefs.current[f.field]?.click()}
                        disabled={uploadingField === f.field}
                        onDragOver={(e) => handleDragOver(f.field, e)}
                        onDragEnter={(e) => handleDragEnter(f.field, e)}
                        onDragLeave={(e) => handleDragLeave(f.field, e)}
                        onDrop={(e) => handleDrop(f.field, e)}
                        aria-label={t(f.defKey)}
                        className={cn(
                          "flex h-20 w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50",
                          dragOverField === f.field && "border-primary bg-muted",
                        )}
                      >
                        {uploadingField === f.field ? (
                          <>
                            <Loader2 className="size-5 animate-spin" />
                            <span className="text-xs">{t("uploading")}</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="size-5" />
                            <span className="text-[11px]">{t("docDropHint")}</span>
                          </>
                        )}
                      </button>
                    )}
                    <input
                      ref={(el) => {
                        inputRefs.current[f.field] = el;
                      }}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => handleFile(f.field, e.target.files?.[0])}
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-4 space-y-2">
              <Label>{t("notesLabel")}</Label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("notesPlaceholder")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              />
            </div>

            {error && (
              <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            {saved && (
              <p className="mt-3 flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
                <CheckCircle2 className="size-4" />
                {t("verificationSubmitted")}
              </p>
            )}

            <div className="mt-4 rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <CloudUpload className="size-4" />
                {t("uploadHint")}
              </p>
            </div>

            <Button type="submit" className="mt-4 w-full gap-2 rounded-2xl" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t("submitDocs")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}