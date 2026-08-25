import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Activity, Building2, Flag, TrendingUp, UserRound } from "lucide-react";
import { getAdminOverview, getRecentActivity } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminAnalyticsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("admin");
  const o = await getAdminOverview();
  const activity = await getRecentActivity(100);

  const money = (cents: number) =>
    new Intl.NumberFormat(locale === "ar" ? "ar-MA" : locale, {
      style: "currency",
      currency: "MAD",
      maximumFractionDigits: 0,
    }).format(cents / 100);

  const kpis = [
    { icon: UserRound, label: t("totalUsers"), value: o.totalUsers, tone: "text-primary bg-primary/10" },
    { icon: TrendingUp, label: t("monthlyGrowth"), value: `+${o.monthlyUserGrowth}`, tone: "text-emerald-500 bg-emerald-500/10" },
    { icon: Building2, label: t("totalBusinesses"), value: o.totalBusinesses, tone: "text-accent bg-accent/10" },
    { icon: Building2, label: t("planFree"), value: o.businessesByPlan.free, tone: "text-muted-foreground bg-muted" },
    { icon: Building2, label: t("planPremium"), value: o.businessesByPlan.premium, tone: "text-amber-500 bg-amber-500/10" },
    { icon: Building2, label: t("planPro"), value: o.businessesByPlan.pro, tone: "text-fuchsia-500 bg-fuchsia-500/10" },
    { icon: Flag, label: t("pendingBusinesses"), value: o.pendingBusinesses, tone: "text-destructive bg-destructive/10" },
    { icon: Flag, label: t("pendingServices"), value: o.pendingServices, tone: "text-destructive bg-destructive/10" },
    { icon: Flag, label: t("pendingProducts"), value: o.pendingProducts, tone: "text-destructive bg-destructive/10" },
    { icon: Activity, label: t("mrr"), value: money(o.mrrCents), tone: "text-primary bg-primary/10" },
    { icon: Activity, label: t("revenue"), value: money(o.totalRevenueCents), tone: "text-primary bg-primary/10" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t("analytics")}</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {kpis.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-3xl border bg-card p-4">
              <span className={"inline-grid size-9 place-items-center rounded-full " + c.tone}>
                <Icon className="size-4" />
              </span>
              <p className="mt-3 text-2xl font-bold tracking-tight">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-3xl border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">{t("topCities")}</h3>
          {o.topCities.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {o.topCities.map((c, i) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                    {c.name}
                  </span>
                  <span className="font-semibold">{c.count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="rounded-3xl border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">{t("topCategories")}</h3>
          {o.topCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {o.topCategories.map((c, i) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                    {c.name}
                  </span>
                  <span className="font-semibold">{c.count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="rounded-3xl border bg-card">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <Activity className="size-4 text-primary" />
          <h3 className="font-semibold">{t("recentActivity")}</h3>
        </div>
        <ul className="divide-y">
          {activity.slice(0, 12).map((a) => (
            <li key={a.kind + a.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <span className="size-2 rounded-full bg-primary/50" />
              <span className="flex-1 truncate">{a.label}</span>
              <span className="text-xs text-muted-foreground">
                {new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : locale, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(a.at))}
              </span>
            </li>
          ))}
          {activity.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">
              {t("empty")}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}