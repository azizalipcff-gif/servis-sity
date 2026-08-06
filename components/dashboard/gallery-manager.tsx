"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SmartImage } from "@/components/smart-image";
import { uploadImage, deleteStoredUrl } from "@/lib/uploads";
import type { BusinessDetail } from "@/lib/queries";

export function GalleryManager({ business }: { business: BusinessDetail }) {
  const t = useTranslations("dashboard.dash");
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const media = business.media;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadImage({
        bucket: "business-gallery",
        ownerId: business.owner_id,
        file,
      });
      if (!result.ok) return;
      await addMedia(result.url);
    } catch {
      /* ignore */
    } finally {
      setUploading(false);
    }
  }

  async function addMedia(url: string) {
    const res = await fetch("/api/dashboard/media", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, type: "image" }),
    });
    if (!res.ok) {
      // DB insert failed — roll back the freshly uploaded object so we never
      // create an orphan file.
      await deleteStoredUrl(url);
      return;
    }
    window.location.reload();
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/dashboard/media?id=${id}`, { method: "DELETE" });
      window.location.reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {media.filter((m) => m.type === "image").map((m) => (
          <div key={m.id} className="group relative overflow-hidden rounded-2xl border">
            <SmartImage
              src={m.url}
              alt=""
              className="aspect-square"
              sizes="(min-width: 640px) 33vw, 50vw"
            />
            <button
              type="button"
              onClick={() => remove(m.id)}
              disabled={busyId === m.id}
              className="absolute end-2 top-2 grid size-8 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label={t("remove")}
            >
              {busyId === m.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </button>
          </div>
        ))}
      </div>

      {media.length === 0 && (
        <p className="rounded-3xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t("noMedia")}
        </p>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-muted-foreground transition-colors hover:bg-muted"
      >
        {uploading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <ImagePlus className="size-5" />
        )}
        <span className="text-xs">{t("addMediaHint")}</span>
      </button>
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
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (url.trim()) addMedia(url.trim());
            setUrl("");
          }}
        >
          {t("addPhoto")}
        </Button>
      </div>
    </div>
  );
}