"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeProfileCompleteness,
  type CompletenessInput,
  type DashboardTab,
} from "@/lib/business/completeness";
import { Button } from "@/components/ui/button";

export function ProfileCompletenessCard({
  data,
  onNavigate,
}: {
  data: CompletenessInput;
  onNavigate: (tab: DashboardTab) => void;
}) {
  const t = useTranslations("dashboard.dash");
  const { score, items } = computeProfileCompleteness(data);
  const missing = items.filter((item) => !item.done);

  return (
    <div className="rounded-3xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{t("completeness")}</p>
        <span className="text-2xl font-bold tracking-tight">{score}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
          style={{ width: `${score}%` }}
        />
      </div>

      {missing.length > 0 ? (
        <ul className="mt-4 space-y-1">
          {items
            .filter((item) => !item.done)
            .map((item) => (
              <li
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t(item.titleKey)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t(item.hintKey)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => onNavigate(item.tab)}
                >
                  {t("improve")}
                  <ArrowRight className="size-3.5 rtl:rotate-180" />
                </Button>
              </li>
            ))}
        </ul>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-sm text-success">
          <Check className="size-4" />
          {t("completenessDone")}
        </p>
      )}

      {score > 0 && score < 100 && (
        <p className={cn("mt-3 text-xs text-muted-foreground")}>
          {t("completenessHint", { points: String(100 - score) })}
        </p>
      )}
    </div>
  );
}