"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Plan } from "@/lib/supabase/database.types";
import type { Interval } from "@/lib/billing/money";

const INTERVALS: Interval[] = ["monthly", "quarterly", "yearly", "lifetime"];

type PricingPlan = Plan & { plan_key: string };

function groupPlans(plans: PricingPlan[]): Record<string, PricingPlan[]> {
  const out: Record<string, PricingPlan[]> = {};
  for (const p of plans) (out[p.plan_key] ??= []).push(p);
  return out;
}

const intervalLabel: Record<Interval, string> = {
  monthly: "/month",
  quarterly: "/quarter",
  yearly: "/year",
  lifetime: "",
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

  return (
    <div className="space-y-8">
      <div className="flex justify-center gap-1 rounded-full border bg-card p-1 text-sm">
        {INTERVALS.map((iv) => (
          <button
            key={iv}
            onClick={() => setInterval(iv)}
            className={`rounded-full px-4 py-2 transition ${interval === iv ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            {tp(iv)}
          </button>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {keys.map((key) => {
          const plan = chosen[key];
          if (!plan) return null;
          const features = Array.isArray(plan.features) ? plan.features : [];
          return (
            <div
              key={key}
              className={`rounded-3xl border p-6 ${plan.sort_order === 0 ? "" : "border-primary/40 bg-card"}`}
            >
              <h3 className="text-lg font-semibold">{tp(key)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{tp(`${key}Desc`)}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold">
                  {plan.price_cents > 0 ? (plan.price_cents / 100).toFixed(0) : "Free"}
                </span>
                {plan.price_cents > 0 && (
                  <span className="text-foreground/70">{t("perPeriod", { period: intervalLabel[interval] })}</span>
                )}
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                {features.map((f: string, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/checkout?plan=${plan.plan_key}&interval=${interval}`}
                className="mt-6 block rounded-xl bg-foreground px-4 py-2.5 text-center text-sm font-semibold text-background hover:opacity-90"
              >
                {plan.price_cents > 0 ? tp("getStarted") : t("upgrade")}
              </Link>
            </div>
          );
        })}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        {t("couponLabel")}: <code className="rounded bg-muted px-2 py-0.5">WELCOME10</code>
      </p>
    </div>
  );
}