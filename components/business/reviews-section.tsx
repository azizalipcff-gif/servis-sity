"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  Building2,
  Loader2,
  Star,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/rating-stars";
import { cn } from "@/lib/utils";
import type { BusinessDetail } from "@/lib/queries";

type SortKey = "newest" | "highest" | "lowest";

export function ReviewsSection({ business }: { business: BusinessDetail }) {
  const t = useTranslations("business");
  const dt = useTranslations("business.detail");
  const router = useRouter();

  const [sort, setSort] = useState<SortKey>("newest");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hover, setHover] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(true);

  const reviews = business.reviews;

  const sorted = useMemo(() => {
    const arr = [...reviews];
    if (sort === "highest") arr.sort((a, b) => b.rating - a.rating);
    else if (sort === "lowest") arr.sort((a, b) => a.rating - b.rating);
    return arr;
  }, [reviews, sort]);

  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
  }));
  const total = reviews.length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ business_id: business.id, rating, comment }),
      });
      if (res.status === 401) {
        setError(t("loginRequired"));
        return;
      }
      if (!res.ok) {
        setError(t("bookingFailed"));
        return;
      }
      setMessage(t("reviewSubmitted"));
      setRating(0);
      setComment("");
      setFormOpen(false);
      // Pull fresh server data so the new review + recomputed average/count
      // appear immediately (the business query is cached on the server).
      router.refresh();
    } catch {
      setError(t("bookingFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-label={t("reviews")}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-lg font-semibold tracking-tight">{t("reviews")}</h2>
          {total > 0 && (
            <span className="text-sm text-muted-foreground">
              {dt("countReviews", { count: total })}
            </span>
          )}
        </div>
        {reviews.length > 0 && (
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            {(["newest", "highest", "lowest"] as SortKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setSort(k)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  sort === k
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {dt(k)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {total > 0 && (
        <div className="mt-5 grid gap-6 rounded-2xl border bg-card p-6 sm:grid-cols-[auto_1fr]">
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold tracking-tight">
              {business.rating_avg.toFixed(1)}
            </div>
            <div>
              <RatingStars rating={business.rating_avg} size="size-4" />
              <p className="mt-1 text-sm text-muted-foreground">
                {dt("overallRating")} · {total}
              </p>
            </div>
          </div>

          <div className="grid flex-1 gap-1.5">
            {distribution.map((d) => (
              <div key={d.stars} className="flex items-center gap-3 text-xs">
                <span className="flex w-10 items-center gap-0.5 text-muted-foreground">
                  {d.stars}
                  <Star className="size-3 fill-warning text-warning" />
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(d.count / total) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full bg-warning"
                  />
                </div>
                <span className="w-8 text-end text-xs text-muted-foreground">
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Write review */}
      <div className="mt-4 rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[15px] font-semibold">{t("writeReview")}</p>

          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${star} stars`}
              >
                <Star
                  className={cn(
                    "size-5 transition-colors",
                    star <= (hover || rating)
                      ? "fill-warning text-warning"
                      : "fill-muted text-muted",
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        {message && (
          <p className="mt-2 text-sm text-success">{message}</p>
        )}

        <AnimatePresence>
          {formOpen && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={submit}
              className="overflow-hidden"
            >
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t("yourReview")}
                  rows={3}
                  className="mt-4 w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />

                {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

                <Button
                type="submit"
                size="sm"
                className="mt-3"
                disabled={loading || rating === 0}
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                {t("submitReview")}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* List */}
      {total === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t("noReviews")} — {t("noReviewsHint")}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {sorted.map((review) => (
            <motion.article
              key={review.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border bg-card p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    {(review.profile?.full_name ?? "س").charAt(0)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">
                        {review.profile?.full_name ?? "—"}
                      </p>
                      {review.rating >= 4 && (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                          <BadgeCheck className="size-3" />
                          {dt("verifiedReview")}
                        </span>
                      )}
                    </div>
                    <RatingStars rating={review.rating} size="size-3.5" />
                  </div>
                </div>
                <time className="text-xs text-muted-foreground">
                  {new Date(review.created_at).toLocaleDateString()}
                </time>
              </div>

              {review.comment && (
                <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                  {review.comment}
                </p>
              )}

              {review.reply && (
                <div className="mt-3 flex gap-3 rounded-xl bg-muted/60 p-3.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                    <Building2 className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold">
                      {dt("ownerReply")}
                    </p>
                    <p className="mt-1 text-sm">{review.reply}</p>
                  </div>
                </div>
              )}
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}