"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { PlanType } from "@/lib/supabase/database.types";

export function PlanPanel({ plan }: { plan: PlanType }) {
  const t = useTranslations("dashboard.dash");

  return (
    <div className="rounded-3xl border bg-card p-5">
      <p className="text-xs text-muted-foreground">{t("views")}</p>
      <div className="mt-1 flex items-center gap-2">
        <span
          className={cn(
            "rounded-full px-3 py-1 text-sm font-bold",
            plan === "free" && "bg-muted text-muted-foreground",
            plan === "premium" && "bg-primary text-primary-foreground",
            plan === "pro" && "bg-foreground text-background",
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
      <Button className="mt-4 w-full gap-2 rounded-2xl" asChild>
        <Link href="/pricing">{t("upgrade")}</Link>
      </Button>
    </div>
  );
}