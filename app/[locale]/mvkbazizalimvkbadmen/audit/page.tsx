import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Activity, ShieldAlert } from "lucide-react";
import { getRecentActivity } from "@/lib/queries";
import type { Locale } from "@/lib/translations";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminAuditPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("admin");
  const activity = await getRecentActivity(60);
  const loc = locale as Locale;

  const fmt = new Intl.DateTimeFormat(loc === "ar" ? "ar-MA" : loc, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">{t("audit")}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{t("operational")}</p>

      <div className="rounded-3xl border bg-card">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <Activity className="size-4 text-primary" />
          <h3 className="font-semibold">{t("recentActivity")}</h3>
        </div>
        {activity.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ol className="divide-y">
            {activity.map((a) => (
              <li key={a.kind + a.id} className="flex items-start gap-3 px-5 py-3">
                <span
                  className={cn(
                    "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                    a.kind === "signup" && "bg-primary/10 text-primary",
                    a.kind === "booking" && "bg-accent/10 text-accent",
                    a.kind === "review" && "bg-amber-500/10 text-amber-500",
                    a.kind === "report" && "bg-destructive/10 text-destructive",
                  )}
                >
                  {a.kind === "report" ? "!" : a.kind[0].toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{a.label}</p>
                  <p className="text-xs text-muted-foreground">{fmt.format(new Date(a.at))}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}