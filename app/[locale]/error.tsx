"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    try {
      fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: "page",
          message: error.message || "unknown",
          digest: error.digest,
        }),
      }).catch(() => {});
    } catch {
      // best-effort only
    }
  }, [error]);

  return (
    <div className="grid min-h-[50vh] place-items-center px-4">
      <div className="text-center">
        <p className="text-lg font-semibold">{t("errorTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("errorBody")}</p>
        <Button className="mt-5" onClick={reset}>
          {t("retry")}
        </Button>
      </div>
    </div>
  );
}