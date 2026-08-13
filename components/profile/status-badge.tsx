"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/status";

const toneClasses = {
  success: "border-transparent bg-success/15 text-success",
  warning: "border-transparent bg-warning/15 text-warning",
  danger: "border-transparent bg-destructive/15 text-destructive",
  muted: "border-transparent bg-muted text-muted-foreground",
} as const;

export function StatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const t = useTranslations("workspace.status");
  const tone = statusTone(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        toneClasses[tone],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          tone === "success" && "bg-success",
          tone === "warning" && "bg-warning",
          tone === "danger" && "bg-destructive",
          tone === "muted" && "bg-muted-foreground",
        )}
      />
      {status ? t(status, { defaultValue: status }) : "—"}
    </span>
  );
}