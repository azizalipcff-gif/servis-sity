import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategoryIcon } from "@/components/category-icon";
import { localizedName, type Locale } from "@/lib/translations";
import type { Category } from "@/lib/supabase/database.types";

export async function CategoryStrip({
  categories,
  counts,
  locale,
}: {
  categories: Category[];
  counts: Record<string, number>;
  locale: Locale;
}) {
  const t = await getTranslations("categories");
  const visible = categories.slice(0, 14);

  if (visible.length === 0) return null;

  return (
    <section className="border-b border-border bg-background">
      <div className="container-site flex items-center justify-between gap-4 py-4">
        <h2 className="text-base font-bold sm:text-lg">{t("browseByCategory")}</h2>
        <Link
          href="/search"
          className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("viewAll")}
        </Link>
      </div>
      <div className="container-site pb-5">
        <div className="rail fade-edge gap-3">
          {visible.map((c) => {
            const Icon = getCategoryIcon(c.icon);
            const n = counts[c.id] ?? 0;
            return (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="group flex w-[92px] shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-card px-2 py-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-soft"
              >
                <span className="grid size-12 place-items-center rounded-full bg-secondary text-primary transition-colors duration-200 group-hover:bg-primary/10">
                  <Icon className="size-5" />
                </span>
                <span className="line-clamp-2 text-[13px] font-medium leading-tight">
                  {localizedName(c, locale)}
                </span>
                {n > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    {n} {t("businesses")}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}