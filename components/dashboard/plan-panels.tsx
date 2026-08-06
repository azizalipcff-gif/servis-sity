"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlanType } from "@/lib/supabase/database.types";

export function PlanPanel({ plan }: { plan: PlanType }) {
  const t = useTranslations("dashboard.dash");

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border bg-card p-5">
        <p className="text-xs text-muted-foreground">{t("views")}</p>
        <div className="mt-1 flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-sm font-bold",
              plan === "free" && "bg-muted text-muted-foreground",
              plan === "premium" && "bg-primary text-primary-foreground",
              plan === "pro" && "bg-[#45489b] text-white",
            )}
          >
            {plan === "free"
              ? t("freePlan")
              : plan === "premium"
                ? t("premiumPlan")
                : t("proPlan")}
          </span>
          <span className="text-sm text-muted-foreground">{t("active")}</span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("renew")}: —
        </p>
        <Button className="mt-4 w-full gap-2 rounded-2xl">
          {t("upgrade")}
        </Button>
      </div>

      <div className="rounded-3xl border bg-card p-5">
        <p className="text-sm font-semibold">{t("completeness")}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
            style={{ width: `${100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function VerificationPanel({
  status,
  verified,
}: {
  status: string;
  verified: boolean;
}) {
  const t = useTranslations("dashboard.dash");
  const u = useTranslations("business");

  return (
    <div className="rounded-3xl border bg-card p-5">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid size-12 place-items-center rounded-2xl",
            verified
              ? "bg-success/10 text-success"
              : "bg-muted text-muted-foreground",
          )}
        >
          <ShieldCheck className="size-6" />
        </span>
        <div>
          <p className="font-semibold">
            {verified ? t("verifiedBadge") : u("verified")}
          </p>
          <p className="text-sm text-muted-foreground">
            {status} · {t("pendingDoc")}
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
        {t("uploadHint")}
      </div>
      <Button className="mt-4 w-full gap-2 rounded-2xl">
        {t("submitDocs")}
      </Button>
    </div>
  );
}