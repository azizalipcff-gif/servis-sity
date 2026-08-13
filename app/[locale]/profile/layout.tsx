import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser, getCurrentProfile } from "@/lib/supabase/user";
import { countMyBusinesses } from "@/lib/workspace";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileNav } from "@/components/profile/profile-nav";

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
    return redirect({ href: "/login", locale: locale as "ar" | "fr" | "en" });
  }
  const userId = user.id;

  const [profile, businessCount] = await Promise.all([
    getCurrentProfile(),
    countMyBusinesses(userId),
  ]);

  return (
    <div className="container-site pb-20">
      <div className="mx-auto max-w-6xl">
        <ProfileHeader
          profile={profile}
          hasBusiness={businessCount > 0}
          locale={locale}
        />
        <div className="mt-6">
          <ProfileNav role={profile?.role} />
        </div>
        <main id="main-content" className="mt-8">{children}</main>
      </div>
    </div>
  );
}