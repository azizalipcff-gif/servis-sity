import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/supabase/user";
import { ProfileTabs } from "@/components/profile-tabs";

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
    <div className="container-site py-10">
      <h1 className="text-editorial mb-8 text-4xl sm:text-5xl">{t("title")}</h1>
      <ProfileTabs tabs={tabs} />
      {children}
    </div>
  );
}