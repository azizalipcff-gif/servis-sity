"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Plan } from "@/lib/supabase/database.types";
import type { Interval } from "@/lib/billing/money";
import { computeTotals } from "@/lib/payments/service";

type CheckoutClientProps = {
  userId: string;
  businessId: string;
  businessName: string;
  plan: Plan;
  interval: Interval;
};

type CheckoutResult = {
  paymentId?: string;
  paymentRef?: string;
  url?: string | null;
  manual?: boolean;
  totals?: { subtotalCents: number; discountCents: number; taxCents: number; totalCents: number };
};

export function CheckoutClient({
  businessId,
  businessName,
  plan,
  interval,
}: CheckoutClientProps) {
  const t = useTranslations("billing");
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<null | { discountCents: number; totalCents: number }>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);

  const totals = computeTotals(plan.price_cents, applied?.discountCents ?? 0, plan.currency);

  async function applyCoupon() {
    setError("");
    const res = await fetch("/api/billing/coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: coupon.trim(), planCode: plan.plan_key, subtotalCents: plan.price_cents }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "coupon_invalid");
      return;
    }
    setApplied({ discountCents: data.discountCents, totalCents: data.totalCents });
  }

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planCode: plan.plan_key,
          interval,
          businessId,
          couponCode: coupon.trim() || undefined,
        }),
      });
      const data: CheckoutResult = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(String(data.paymentRef ?? "internal_error"));
        setBusy(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setManual(true);
      setBusy(false);
    } catch {
      setError("internal_error");
      setBusy(false);
    }
  }

  if (manual) {
    return (
      <div className="rounded-3xl border bg-card p-8 max-w-xl">
        <h2 className="text-lg font-semibold">{t("payment.chooseProvider")}</h2>
        <p className="mt-3 text-sm text-muted-foreground">{t("payment.manualInstructions")}</p>
        <Link
          href="/pricing"
          className="mt-6 inline-block rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background"
        >
          {t("payment.backToPlans")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3 space-y-6">
        <div className="rounded-3xl border bg-card p-6">
          <h2 className="font-semibold">{businessName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {plan.name} · {t("perPeriod", { period: interval })}
          </p>
        </div>

        <div className="rounded-3xl border bg-card p-6">
          <h2 className="mb-4 font-semibold">{t("couponLabel")}</h2>
          <div className="flex gap-2">
            <input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder={t("couponPlaceholder")}
              className="flex-1 rounded-xl border bg-background px-4 py-2 text-sm outline-none focus:ring-2 ring-primary/40"
            />
            <button
              onClick={applyCoupon}
              className="rounded-xl bg-muted px-4 py-2 text-sm font-semibold hover:bg-muted/70"
            >
              {t("couponApply")}
            </button>
          </div>
          {applied && (
            <button
              onClick={() => setApplied(null)}
              className="mt-3 text-xs text-primary underline"
            >
              {t("coupon_reset")}
            </button>
          )}
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </div>
      </div>

      <div className="lg:col-span-2 h-fit rounded-3xl border bg-card p-6">
        <h2 className="mb-4 font-semibold">{(plan.price_cents / 100).toFixed(0)} {t("currency")}</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>{t("subtotal")}</dt>
            <dd>{(totals.subtotalCents / 100).toFixed(2)} {t("currency")}</dd>
          </div>
          {totals.discountCents > 0 && (
            <div className="flex justify-between text-emerald-600">
              <dt>{t("discount")}</dt>
              <dd>-{(totals.discountCents / 100).toFixed(2)} {t("currency")}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>{t("tax")}</dt>
            <dd>{(totals.taxCents / 100).toFixed(2)} {t("currency")}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 font-semibold">
            <dt>{t("total")}</dt>
            <dd>{(totals.totalCents / 100).toFixed(2)} {t("currency")}</dd>
          </div>
        </dl>
        <button
          onClick={pay}
          disabled={busy}
          className="mt-6 w-full rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
        >
          {busy ? t("processing") : t("payNow")}
        </button>
        {error && !applied && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}