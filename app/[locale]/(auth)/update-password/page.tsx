import { setRequestLocale, getTranslations } from "next-intl/server";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function UpdatePasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <UpdatePasswordForm />;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return {
    title: t("updatePasswordTitle"),
    robots: { index: false, follow: false },
  };
}
