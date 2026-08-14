import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/supabase/user";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function DashboardLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login", locale: locale as "ar" | "fr" | "en" });
  }

  const t = await getTranslations("dashboard");

  return (
    <div className="container-site py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <Link
          href="/dashboard/billing"
          className="rounded-full border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          {t("dash.billingLink")}
        </Link>
      </div>
      {children}
    </div>
  );
}
