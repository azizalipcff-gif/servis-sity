import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/supabase/user";

export const dynamic = "force-dynamic";

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
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{t("title")}</h1>
      {children}
    </div>
  );
}
