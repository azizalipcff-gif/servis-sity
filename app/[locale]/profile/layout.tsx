import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/supabase/user";

export const dynamic = "force-dynamic";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function ProfileLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login", locale: locale as "ar" | "fr" | "en" });
  }

  const t = await getTranslations("profile");

  const tabs = [
    { href: "/profile", label: t("tabProfile") },
    { href: "/profile/settings", label: t("tabSettings") },
    { href: "/profile/notifications", label: t("tabNotifications") },
    { href: "/profile/favorites", label: t("tabFavorites") },
    { href: "/profile/security", label: t("tabSecurity") },
  ];

  return (
    <div className="container-site py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{t("title")}</h1>
      <div className="mb-8 flex gap-1 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}