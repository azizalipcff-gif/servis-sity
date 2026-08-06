import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Activity, CalendarDays, Flag, Star, UserRound } from "lucide-react";
import { getRecentActivity } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminAnalyticsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("admin");
  const activity = await getRecentActivity(100);

  const counts = {
    bookings: activity.filter((a) => a.kind === "booking").length,
    reviews: activity.filter((a) => a.kind === "review").length,
    reports: activity.filter((a) => a.kind === "report").length,
    signups: activity.filter((a) => a.kind === "signup").length,
  };

  const cards = [
    { icon: CalendarDays, label: t("bookings"), value: counts.bookings, tone: "text-accent bg-accent/10" },
    { icon: Star, label: t("totalReviews"), value: counts.reviews, tone: "text-amber-500 bg-amber-500/10" },
    { icon: Flag, label: t("reports"), value: counts.reports, tone: "text-destructive bg-destructive/10" },
    { icon: UserRound, label: t("signups"), value: counts.signups, tone: "text-primary bg-primary/10" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t("analytics")}</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => {
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