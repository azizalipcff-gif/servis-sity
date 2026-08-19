import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/supabase/user";
import { getWorkspaceState } from "@/lib/workspace";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileNav } from "@/components/profile/profile-nav";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function ProfileLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const state = await getWorkspaceState();
  const user = state.user;
  if (!user) {
    return redirect({ href: "/login", locale: locale as "ar" | "fr" | "en" });
  }

  const profile = await getCurrentProfile();

  return (
    <div className="container-site pb-20">
      <div className="mx-auto max-w-6xl">
        <ProfileHeader
          profile={profile}
          hasBusiness={state.hasBusiness}
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