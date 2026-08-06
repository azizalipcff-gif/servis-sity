"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/rating-stars";
import type { BusinessDetail } from "@/lib/queries";

export function ReviewsManager({
  reviews,
}: {
  reviews: BusinessDetail["reviews"];
}) {
  const t = useTranslations("dashboard.dash");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function sendReply(reviewId: string) {
    const text = (replies[reviewId] ?? "").trim();
    if (!text) return;
    setBusy(reviewId);
    try {
      await fetch("/api/dashboard/reviews/reply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ review_id: reviewId, reply: text }),
      });
      window.location.reload();
    } finally {
      setBusy(null);
    }
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t("noReviews")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <div key={r.id} className="rounded-3xl border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-primary/10 font-bold text-primary">
                {(r.profile?.full_name ?? "•").charAt(0)}
              </span>
              <RatingStars rating={r.rating} size="size-4" />
            </div>
            <time className="text-xs text-muted-foreground">
              {new Date(r.created_at).toLocaleDateString()}
            </time>
          </div>
          {r.comment && (
            <p className="mt-3 text-sm text-foreground/85">{r.comment}</p>
          )}

          {r.reply ? (
            <div className="mt-3 flex gap-3 rounded-2xl bg-muted/60 p-4">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                <Building2 className="size-4" />
              </span>
              <div className="flex-1">
                <p className="text-xs font-semibold">{t("reply")}</p>
                <p className="mt-1 text-sm">{r.reply}</p>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <textarea
                value={replies[r.id] ?? ""}
                onChange={(e) =>
                  setReplies((m) => ({ ...m, [r.id]: e.target.value }))
                }
                placeholder={t("replyPlaceholder")}
                rows={2}
                className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => sendReply(r.id)}
                disabled={busy === r.id || !(replies[r.id] ?? "").trim()}
                className="gap-1.5"
              >
                {busy === r.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {t("saveReply")}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}