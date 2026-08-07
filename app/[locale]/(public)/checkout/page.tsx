import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/lib/translations";
import { getCurrentUser } from "@/lib/supabase/user";
import { getMyBusiness } from "@/lib/queries";
import { getPlan } from "@/lib/billing/plans";
import type { Interval } from "@/lib/billing/money";
import { CheckoutClient } from "@/components/billing/checkout-client";

export const dynamic = "force-dynamic";

const VALID: Interval[] = ["monthly", "quarterly", "yearly", "lifetime"];

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string; interval?: string }>;
};

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const { plan: planKey, interval: rawInterval } = await searchParams;
  const interval = (VALID as string[]).includes(rawInterval ?? "")
    ? (rawInterval as Interval)
    : "monthly";

  const t = await getTranslations("billing");

  const user = await getCurrentUser();
  if (!user)
    redirect({ href: "/login", locale: locale as "ar" | "fr" | "en" });

  const plan = planKey ? await getPlan(planKey, interval) : null;
  if (!plan)
    redirect({ href: "/pricing", locale: locale as "ar" | "fr" | "en" });

  const business = await getMyBusiness(user!.id);
  if (!business)
    redirect({ href: "/dashboard", locale: locale as "ar" | "fr" | "en" });

  return (
    <div className="container-site py-12">
      <h1 className="mb-8 text-2xl font-bold tracking-tight">{t("payment.title")}</h1>
      <CheckoutClient
        userId={user!.id}
        businessId={business!.id}
        businessName={business!.name}
        plan={plan!}
        interval={interval}
      />
    </div>
  );
}
