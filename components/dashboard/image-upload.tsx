"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Loader2, X } from "lucide-react";
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
  const tUp = useTranslations("uploadError");
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
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
  }

  function translatedError(error: string): string {
    const key = uploadErrorMessageKey(error);
    return key ? tUp(key) : tCommon("error");
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {value ? (
        <div className="relative overflow-hidden rounded-md border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-32 w-full object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            disabled={clearing}
            aria-label="remove"
            className="absolute end-2 top-2 flex size-6 items-center justify-center rounded-full bg-background/80 text-foreground hover:bg-background disabled:opacity-50"
          >
            {clearing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <X className="size-4" />
            )}
          </button>
        </div>
      ) : (
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
          <span className="text-xs">{hint}</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="flex gap-2">
        <Input
          dir="ltr"
          placeholder="https://..."
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
        />
        <Button type="button" variant="outline" size="sm" onClick={handleUrl}>
          {tCommon("save")}
        </Button>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}