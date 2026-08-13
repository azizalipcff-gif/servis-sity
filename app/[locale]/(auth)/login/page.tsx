import { setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";
import { safeReturnTo, stripLocalePrefix } from "@/lib/auth/return-to";

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

  const validReturnTo = safeReturnTo(returnToParam);
  const returnTo = validReturnTo ? stripLocalePrefix(validReturnTo) : undefined;

  return <LoginForm returnTo={returnTo} />;
}