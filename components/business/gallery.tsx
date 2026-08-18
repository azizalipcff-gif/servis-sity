"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SmartImage } from "@/components/smart-image";
import { trackInteraction } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

type ImageItem = { id: string; url: string };

export function Gallery({
  images,
  title,
  businessId,
}: {
  images: ImageItem[];
  title: string;
  businessId: string;
}) {
  const t = useTranslations("business");
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (selected === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const next = useCallback(() => {
    setSelected((s) => (s === null ? s : (s + 1) % images.length));
  }, [images.length]);

  const prev = useCallback(() => {
    setSelected((s) =>
      s === null ? s : (s - 1 + images.length) % images.length,
    );
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <section aria-label={t("gallery")}>
      <div className="flex items-baseline gap-2.5">
        <h2 className="text-lg font-semibold tracking-tight">{t("gallery")}</h2>
        <span className="text-sm text-muted-foreground">
          {t("photos", { count: images.length })}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
        {images.slice(0, 8).map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => {
              setSelected(index);
              trackInteraction(businessId, "photo_view");
            }}
            className={cn(
              "group relative overflow-hidden rounded-2xl bg-muted",
              index === 0 ? "aspect-square sm:col-span-2 sm:row-span-2" : "aspect-square",
            )}
          >
            <SmartImage
              src={image.url}
              alt={`${title} - ${index + 1}`}
              sizes="(min-width: 640px) 33vw, 50vw"
              className={cn(
                "h-full w-full",
                index === 0
                  ? "sm:h-full sm:min-h-full"
                  : "aspect-square",
              )}
              imgClassName="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/30 group-hover:opacity-100">
              <ZoomIn className="size-6 text-white" />
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selected !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              key={selected}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="relative h-[80vh] w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <SmartImage
                src={images[selected].url}
                alt={`${title} - ${selected + 1}`}
                sizes="100vw"
                className="h-full w-full rounded-2xl"
              />
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="absolute end-2 top-2 grid size-9 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      prev();
                    }}
                    className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/25"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      next();
                    }}
                    className="absolute start-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/25"
                    aria-label="Next"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </>
              )}
              <div className="absolute bottom-4 start-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                {selected + 1} / {images.length}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}