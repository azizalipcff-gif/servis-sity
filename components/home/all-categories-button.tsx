import { ArrowRight, LayoutGrid } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export async function AllCategoriesButton() {
  const t = await getTranslations("categories");

  return (
    <section className="border-b border-border bg-background">
      <div className="container-site flex py-6 sm:py-8">
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/search">
            <LayoutGrid className="size-4" />
            {t("viewAll")}
            <ArrowRight className="size-4 rtl:rotate-180" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
