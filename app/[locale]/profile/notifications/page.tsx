import { setRequestLocale, getTranslations } from "next-intl/server";
import { NotificationsList } from "@/components/profile/notifications-list";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ProfileNotificationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("profile");

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">{t("tabNotifications")}</h2>
      <NotificationsList />
    </div>
  );
}