"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ImagePlus, Link2, Loader2, RefreshCw, Trash2 } from "lucide-react";
import type { StorageImageBucket } from "@/lib/supabase/storage";
import { uploadImage, deleteStoredUrl } from "@/lib/uploads";
import { uploadErrorMessageKey } from "@/lib/uploads/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  label: string;
  hint: string;
  userId: string;
  bucket: StorageImageBucket;
  value: string;
  onChange: (url: string) => void;
};

export function ImageUploadField({
  label,
  hint,
  userId,
  bucket,
  value,
  onChange,
}: Props) {
  const tCommon = useTranslations("common");
  const tUpload = useTranslations("common.uploadError");
  const tDash = useTranslations("dashboard");
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const result = await uploadImage({ bucket, ownerId: userId, file });
      if (!result.ok) {
        setError(translatedError(result.error));
        return;
      }
      // Delete-on-replace: remove the previous stored object (best-effort,
      // owner-scoped) before committing the new URL — never leave orphans.
      if (value && value !== result.url) {
        await deleteStoredUrl(value);
      }
      onChange(result.url);
    } catch {
      setError(tCommon("error"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setError(null);
    setClearing(true);
    try {
      await deleteStoredUrl(value);
      onChange("");
    } finally {
      setClearing(false);
    }
  }

  function handleUrl() {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setUrlDraft("");
    setError(null);
    setShowUrl(false);
  }

  function translatedError(error: string): string {
    const key = uploadErrorMessageKey(error);
    return key ? tUpload(key) : tCommon("error");
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {value ? (
        <div className="relative overflow-hidden rounded-md border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-32 w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading || clearing}
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              {tDash("changeImage")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={uploading || clearing}
            >
              {clearing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              {tDash("removeImage")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ImagePlus className="size-5" />
            )}
            <span className="text-xs">
              {uploading ? tDash("uploading") : hint}
            </span>
          </button>

          {uploading && (
            <div className="space-y-1">
              <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="absolute inset-y-0 w-2/5 rounded-full bg-primary"
                  animate={{ x: ["-110%", "260%"] }}
                  transition={{
                    duration: 1.1,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {tDash("uploadProgress")}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowUrl((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Link2 className="size-3" />
            {tDash("orPasteUrl")}
          </button>

          {showUrl && (
            <div className="flex gap-2">
              <Input
                dir="ltr"
                aria-label={tDash("pasteUrlLabel")}
                placeholder="https://..."
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUrl}
              >
                {tCommon("save")}
              </Button>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
