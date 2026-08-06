import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { getCategoryIcon } from "@/components/category-icon";
import { localizedName, type Locale } from "@/lib/translations";
import type { Category } from "@/lib/supabase/database.types";

export async function CategoriesGrid({
  categories,
  locale,
}: {
  categories: Category[];
  locale: Locale;
}) {
  const t = await getTranslations("categories");

  if (categories.length === 0) return null;

  return (
    <section className="container-site py-16">
      <FadeIn>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">{t("title")}</h2>
            <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Link
            href="/search"
            className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex"
          >
            {t("viewAll")}
            <ChevronRight className="size-4 rtl:rotate-180" />
          </Link>
        </div>
      </FadeIn>

      <Stagger className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {categories.slice(0, 12).map((category) => {
          const Icon = getCategoryIcon(category.icon);
          return (
            <StaggerItem key={category.id}>
              <Link
                href={`/category/${category.slug}`}
                className="group flex h-full flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-6" />
                </span>
                <span className="line-clamp-2 text-sm font-medium">
                  {localizedName(category, locale)}
                </span>
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>
    </section>
  );
}
