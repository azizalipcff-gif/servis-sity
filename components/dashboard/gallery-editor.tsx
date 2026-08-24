"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { uploadImage } from "@/lib/uploads";

export type GalleryItem = { id?: string; url: string; sort_order: number };

type Props = {
  items: GalleryItem[];
  onChange: (items: GalleryItem[]) => void;
  userId: string;
};

export function GalleryEditor({ items, onChange, userId }: Props) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const res = await uploadImage({ bucket: "business-gallery", ownerId: userId, file });
      if (!res.ok) {
        setError(tCommon("error"));
        return;
      }
      // Append as a brand-new (unsaved) item. It is only written to the
      // database when the parent form is submitted, so an accidental upload
      // never persists unless the owner saves. Existing images are never
      // touched here.
      onChange([...items, { url: res.url, sort_order: items.length }]);
    } catch {
      setError(tCommon("error"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function remove(url: string) {
    onChange(items.filter((i) => i.url !== url));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = items.slice();
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange(next.map((item, i) => ({ ...item, sort_order: i })));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <div
            key={item.id ?? item.url}
            className="relative h-24 w-24 overflow-hidden rounded-lg border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent p-1">
              <button
                type="button"
                aria-label={t("moveUp")}
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className="rounded bg-background/80 p-0.5 text-foreground hover:bg-background disabled:opacity-30"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={t("moveDown")}
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
                className="rounded bg-background/80 p-0.5 text-foreground hover:bg-background disabled:opacity-30"
              >
                <ArrowDown className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={t("removeImage")}
                onClick={() => remove(item.url)}
                className="rounded bg-background/80 p-0.5 text-destructive hover:bg-background"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Plus className="size-5" />
          )}
          <span className="text-xs">{uploading ? t("uploading") : t("addImage")}</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
