import { setRequestLocale, getTranslations } from "next-intl/server";
import { FavoritesList } from "@/components/profile/favorites-list";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ProfileFavoritesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("profile");

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">{t("tabFavorites")}</h2>
      <FavoritesList />
    </div>
  );
}