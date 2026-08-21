"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Tag } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Plan } from "@/lib/supabase/database.types";
import type { Interval } from "@/lib/billing/money";

const INTERVALS: Interval[] = ["monthly", "quarterly", "yearly", "lifetime"];

type PricingPlan = Plan & { plan_key: string };

function groupPlans(plans: PricingPlan[]): Record<string, PricingPlan[]> {
  const out: Record<string, PricingPlan[]> = {};
  for (const p of plans) (out[p.plan_key] ??= []).push(p);
  return out;
}

const intervalMonths: Partial<Record<Interval, number>> = {
  quarterly: 3,
  yearly: 12,
};

export function PricingGrid({ plans }: { plans: PricingPlan[] }) {
  const t = useTranslations("billing");
  const tp = useTranslations("pricing");
  const grouped = useMemo(() => groupPlans(plans), [plans]);
  const keys = Object.keys(grouped);
  const [interval, setInterval] = useState<Interval>("monthly");

  const chosen = Object.fromEntries(
    keys.map((k) => [k, grouped[k].find((p) => p.interval === interval) ?? grouped[k][0]]),
  ) as Record<string, PricingPlan>;

  const featuredIndex = keys.length > 1 ? Math.floor((keys.length - 1) / 2) : 0;
  const lastIndex = keys.length - 1;

  const gridCols =
    keys.length <= 2
      ? "mx-auto max-w-3xl gap-5 sm:grid-cols-2 md:gap-6"
      : keys.length === 3
        ? "gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6"
        : "gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6";

  return (
    <div className="w-full min-w-0">
      <PeriodSelector grouped={grouped} interval={interval} onChange={setInterval} />

      <div className={cn("mt-10 grid min-w-0 grid-cols-1 items-stretch", gridCols)}>
        {keys.map((key, i) => {
          const plan = chosen[key];
          if (!plan) return null;
          const tone: PricingTone =
            i === lastIndex ? "dark" : i === featuredIndex ? "featured" : "light";
          return (
            <PricingCard
              key={key}
              plan={plan}
              name={tp(key)}
              description={tp(`${key}Desc`)}
              tone={tone}
              ctaLabel={plan.price_cents > 0 ? tp("getStarted") : t("upgrade")}
              href={`/checkout?plan=${plan.plan_key}&interval=${interval}`}
              interval={interval}
            />
          );
        })}
      </div>

      <CouponBox
        representativePlan={
          Object.values(chosen).find((p) => p?.price_cents > 0) ?? null
        }
      />
    </div>
  );
}

/* -------------------------------- billing period -------------------------------- */

function PeriodSelector({
  grouped,
  interval,
  onChange,
}: {
  grouped: Record<string, PricingPlan[]>;
  interval: Interval;
  onChange: (iv: Interval) => void;
}) {
  const tp = useTranslations("pricing");
  const t = useTranslations("billing");
  const savePct = useMemo(
    () => Object.fromEntries(INTERVALS.map((iv) => [iv, computeSavePct(grouped, iv)])) as Record<Interval, number | null>,
    [grouped],
  );

  return (
    <div
      role="group"
      aria-label={t("periodSelector")}
      className="flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-border bg-card p-1 shadow-sm"
    >
      {INTERVALS.map((iv) => {
        const active = iv === interval;
        const pct = savePct[iv];
        return (
          <button
            key={iv}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(iv)}
            className={cn(
              "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-4",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tp(iv)}
            {pct != null && pct > 0 && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none",
                  active ? "bg-primary-foreground/15 text-primary-foreground" : "bg-primary/10 text-primary",
                )}
              >
                {t("savePct", { pct })}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------- price card ---------------------------------- */

type PricingTone = "light" | "featured" | "dark";

function PricingCard({
  plan,
  name,
  description,
  tone,
  ctaLabel,
  href,
  interval,
}: {
  plan: PricingPlan;
  name: string;
  description: string;
  tone: PricingTone;
  ctaLabel: string;
  href: string;
  interval: Interval;
}) {
  const tp = useTranslations("pricing");
  const t = useTranslations("billing");
  const price = plan.price_cents > 0 ? (plan.price_cents / 100).toLocaleString() : tp("free");
  const features = Array.isArray(plan.features) ? plan.features : [];

  const cardClasses = cn(
    "relative flex h-full min-w-0 flex-col rounded-3xl border p-6 shadow-sm lg:p-7",
    tone === "light" && "border-border bg-card",
    tone === "featured" && "z-10 border-primary bg-primary/[0.04] shadow-lift",
    tone === "dark" && "border-neutral-800 bg-foreground text-background shadow-lift lg:scale-[1.02]",
  );

  const muted = tone === "dark" ? "text-background/60" : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={cardClasses}
    >
      {tone === "featured" && (
        <span className="absolute -top-3.5 start-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-sm rtl:translate-x-1/2">
          {tp("mostPopular")}
        </span>
      )}

      <h3 className={cn("text-lg font-bold tracking-tight", tone === "dark" && "text-background")}>
        {name}
      </h3>
      <p className={cn("mt-1.5 min-h-[2.5rem] text-sm leading-relaxed", muted)}>{description}</p>

      <div className="mt-5 flex min-w-0 flex-wrap items-baseline gap-x-1.5">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={interval}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-4xl font-extrabold tracking-tight",
              tone === "dark" ? "text-background" : "text-foreground",
            )}
          >
            <span className="whitespace-nowrap">{price}</span>
            {plan.price_cents > 0 && (
              <span className={cn("text-base font-medium", muted)}>{t("currency")}</span>
            )}
            {periodLabel(interval) && (
              <span className={cn("text-base font-medium", muted)}>{periodLabel(interval)}</span>
            )}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className={cn("mt-5 h-px w-full", tone === "dark" ? "bg-background/15" : "bg-border")} />

      <ul className="mt-5 flex-1 space-y-2.5 text-sm">
        {(features as string[]).map((f: string, i: number) => (
          <li key={i} className="flex w-full min-w-0 items-start gap-2.5">
            <span
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                tone === "dark" ? "bg-background/25 text-background" : "bg-primary/10 text-primary",
              )}
            >
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            <span className={cn("min-w-0 flex-1 leading-snug", tone === "dark" ? "text-background/80" : "text-foreground/80")}>
              {f}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-7">
        <Button
          asChild
          variant={tone === "light" ? "outlinePrimary" : "default"}
          className={cn(
            "w-full",
            tone === "dark" && "bg-background text-foreground hover:bg-background/90",
          )}
        >
          <Link href={href}>{ctaLabel}</Link>
        </Button>
      </div>
    </motion.div>
  );
}

/* ---------------------------------- coupon ---------------------------------- */

function CouponBox({ representativePlan }: { representativePlan: PricingPlan | null }) {
  const t = useTranslations("billing");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!representativePlan) return null;

  const canApply = !busy && code.trim().length > 0 && !!representativePlan;

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    const value = code.trim();
    if (!value || busy || !representativePlan) return;
    setBusy(true);
    setError(null);
    setApplied(null);
    try {
      const res = await fetch("/api/billing/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: value,
          planCode: representativePlan.plan_key,
          subtotalCents: representativePlan.price_cents,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          res.status === 401
            ? t("couponLogin")
            : mapCouponError(typeof data.error === "string" ? data.error : undefined, t),
        );
        return;
      }
      setApplied(t("couponSuccess"));
    } catch {
      setError(t("couponError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-12 w-full max-w-md">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <Label htmlFor="pricing-coupon" className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Tag className="size-4 text-primary" />
          {t("couponLabel")}
        </Label>

        <form onSubmit={handleApply} className="mt-3 flex w-full items-center gap-2">
          <Input
            id="pricing-coupon"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setApplied(null);
              setError(null);
            }}
            placeholder={t("couponPlaceholder")}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "pricing-coupon-error" : undefined}
            autoComplete="off"
            className="h-11 min-w-0 flex-1 rounded-xl"
          />
          <Button type="submit" disabled={!canApply} className="h-11 shrink-0 rounded-xl px-4">
            {busy ? <Loader2 className="size-4 animate-spin" /> : t("couponApply")}
          </Button>
        </form>

        {applied && (
          <p role="status" className="mt-3 text-sm font-medium text-success">
            {applied}
          </p>
        )}
        {error && (
          <p id="pricing-coupon-error" role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <p className="mt-3 text-xs text-muted-foreground">{t("couponHint")}</p>
      </div>
    </div>
  );
}

/* ---------------------------------- helpers ---------------------------------- */

function periodLabel(interval: Interval): string | null {
  switch (interval) {
    case "monthly":
      return "/month";
    case "quarterly":
      return "/quarter";
    case "yearly":
      return "/year";
    case "lifetime":
      return "";
  }
}

/** Whole-number savings vs. paying monthly, nullable when data can't support it. */
function computeSavePct(
  grouped: Record<string, PricingPlan[]>,
  interval: Interval,
): number | null {
  const months = intervalMonths[interval];
  if (!months) return null;
  const pairs = Object.values(grouped)
    .map((g) => {
      const monthly = g.find((p) => p.interval === "monthly");
      const target = g.find((p) => p.interval === interval);
      return { monthly, target };
    })
    .filter(
      (p): p is { monthly: PricingPlan; target: PricingPlan } =>
        !!p.monthly &&
        !!p.target &&
        p.monthly.price_cents > 0 &&
        p.target.price_cents > 0,
    );
  if (pairs.length === 0) return null;
  const pcts = pairs.map(
    (p) => Math.round(100 - (p.target.price_cents * 100) / (p.monthly.price_cents * months)),
  );
  const min = Math.min(...pcts);
  const max = Math.max(...pcts);
  if (max <= 0 || min !== max) return null;
  return min;
}

function mapCouponError(
  key: string | undefined,
  t: (k: string) => string,
): string {
  if (!key) return t("couponError");
  if (key === "coupon_invalid" || key === "coupon_empty") return t("couponInvalid");
  if (key === "coupon_expired") return t("couponExpired");
  return t("couponError");
}