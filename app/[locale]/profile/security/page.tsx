import { setRequestLocale, getTranslations } from "next-intl/server";
import { ProfileSecurityForm } from "@/components/profile/profile-security-form";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ProfileSecurityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("profile");

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">{t("tabSecurity")}</h2>
      <ProfileSecurityForm />
    </div>
  );
}