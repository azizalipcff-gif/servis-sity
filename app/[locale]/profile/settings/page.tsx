import { setRequestLocale, getTranslations } from "next-intl/server";
import { getCurrentUser, getCurrentProfile } from "@/lib/supabase/user";
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ProfileSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("profile");

  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-6 text-sm text-muted-foreground">{t("settingsIntro")}</p>
      {profile && user ? (
        <ProfileSettingsForm profile={profile} userId={user.id} />
      ) : null}
    </div>
  );
}