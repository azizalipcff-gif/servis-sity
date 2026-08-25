import { LayoutGrid } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export async function AllCategoriesNavButton() {
  const t = await getTranslations("categories");

  return (
    <Button
      asChild
      variant="outlinePrimary"
      className="hidden shrink-0 gap-2 sm:inline-flex"
    >
      <Link href="/search" aria-label={t("viewAll")}>
        <LayoutGrid className="size-4" />
        <span>{t("viewAll")}</span>
      </Link>
    </Button>
  );
}
