import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/user";
import { getFavoritesForUser } from "@/lib/favorites";
import { FavoritesList } from "@/components/profile/favorites-list";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ProfileFavoritesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("profile");

  const user = await getCurrentUser();
  if (!user) {
    redirect(
      `/${locale}/login?returnTo=${encodeURIComponent("/profile/favorites")}`,
    );
  }

  const data = await getFavoritesForUser(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("tabFavorites")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("favoritesIntro")}</p>
      </div>
      <FavoritesList initial={data} />
    </div>
  );
}