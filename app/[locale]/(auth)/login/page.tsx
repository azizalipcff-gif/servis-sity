import { setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const returnToParam = Array.isArray(sp.returnTo)
    ? sp.returnTo[0]
    : sp.returnTo;

  const returnTo =
    typeof returnToParam === "string" &&
    returnToParam.startsWith("/") &&
    !returnToParam.startsWith("//")
      ? returnToParam
      : undefined;

  return <LoginForm returnTo={returnTo} />;
}