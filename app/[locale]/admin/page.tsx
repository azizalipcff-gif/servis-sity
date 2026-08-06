import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import {
  Activity,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Flag,
  MapPin,
  ShieldCheck,
  Star,
  Tags,
  UserRound,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  getAdminDashboard,
  getSystemHealth,
  getRecentActivity,
} from "@/lib/queries";
import type { Locale } from "@/lib/translations";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminOverviewPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [stats, health, activity] = await Promise.all([
    getAdminDashboard(),
    getSystemHealth(),
    getRecentActivity(10),
  ]);

  const t = await getTranslations("admin");
  const loc = locale as Locale;

  const cards = [
    { icon: Building2, label: t("totalBusinesses"), value: stats.businesses, href: "/admin/businesses" },
    { icon: ShieldCheck, label: t("pendingBusinesses"), value: stats.pendingBusinesses, href: "/admin/businesses" },
    { icon: ShieldCheck, label: t("pendingVerification"), value: stats.pendingVerification, href: "/admin/businesses" },
    { icon: UserRound, label: t("totalUsers"), value: stats.users, href: "/admin/users" },
    { icon: UserRound, label: t("premiumUsers"), value: stats.premiumUsers, href: "/admin/users" },
    { icon: CircleDollarSign, label: t("revenue"), value: `${stats.revenue}`, href: "/admin/bookings" },
    { icon: Flag, label: t("reportsCount"), value: stats.reports, href: "/admin/reports" },
    { icon: Tags, label: t("activeCategories"), value: stats.categories, href: "/admin/categories" },
    { icon: MapPin, label: t("totalCities"), value: stats.cities, href: "/admin/cities" },
    { icon: CalendarDays, label: t("totalBookings"), value: stats.bookings, href: "/admin/bookings" },
    { icon: Star, label: t("totalReviews"), value: stats.reviews, href: "/admin/businesses" },
    { icon: ShieldCheck, label: t("subscriptions"), value: stats.subscriptions, href: "/admin/users" },
  ];

  const activityIcon = (kind: string) =>
    kind === "signup" ? (
      <UserRound className="size-4" />
    ) : kind === "report" ? (
      <Flag className="size-4" />
    ) : (
      <Activity className="size-4" />
    );

  return (
    <div className="space-y-8">
      {/* System health banner */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-3xl border p-5",
          health.ok ? "border-emerald-300/40 bg-emerald-500/5" : "border-red-300/40 bg-red-500/5",
        )}
      >
        <span
          className={cn(
            "relative flex size-2.5",
          )}
        >
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              health.ok ? "bg-emerald-500" : "bg-red-500",
            )}
          />
          <span
            className={cn(
              "relative inline-flex size-2.5 rounded-full",
              health.ok ? "bg-emerald-500" : "bg-red-500",
            )}
          />
        </span>
        <div>
          <p className="font-semibold">
            {t("systemHealth")} · {t("healthy")}
          </p>
          <p className="text-sm text-muted-foreground">{t("operational")}</p>
        </div>
        <div className="ms-auto flex gap-1.5">
          {health.checks.map((c) => (
            <span
              key={c.key}
              className={cn("size-2 rounded-full", c.ok ? "bg-emerald-500" : "bg-red-500")}
              title={c.label}
            />
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group rounded-3xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <Icon className="size-5 text-primary" />
              <p className="mt-3 text-2xl font-bold tracking-tight">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Recent activity */}
      <div className="rounded-3xl border bg-card">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <Activity className="size-4 text-primary" />
          <h2 className="font-semibold">{t("recentActivity")}</h2>
        </div>
        <ul className="divide-y">
          {activity.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">
              {t("empty")}
            </li>
          )}
          {activity.map((a) => (
            <li key={a.kind + a.id} className="flex items-center gap-3 px-5 py-3">
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full",
                  a.kind === "signup" && "bg-primary/10 text-primary",
                  a.kind === "booking" && "bg-accent/10 text-accent",
                  a.kind === "review" && "bg-amber-500/10 text-amber-500",
                  a.kind === "report" && "bg-destructive/10 text-destructive",
                )}
              >
                {activityIcon(a.kind)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{a.label}</p>
                <p className="text-xs text-muted-foreground">
                  {shortDate(a.at, loc)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function shortDate(v: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(v));
}