import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localizedName, type Locale } from "@/lib/translations";
import type { Category } from "@/lib/supabase/database.types";

type ModuleDef = {
  key: string;
  slugs: string[];
};

const MODULES: ModuleDef[] = [
  { key: "home", slugs: ["electricien", "plombier", "peintre", "nettoyage", "menuiserie"] },
  { key: "auto", slugs: ["mecanicien", "auto-services"] },
  { key: "beauty", slugs: ["coiffeur", "beaute"] },
  { key: "food", slugs: ["restaurant", "restaurants", "cafe"] },
];

export async function PopularCategories({
  categories,
  locale,
}: {
  categories: Category[];
  locale: Locale;
}) {
  const t = await getTranslations("popularCategories");

  if (categories.length === 0) return null;

  const bySlug = new Map(categories.map((c) => [c.slug, c]));

  const rows = MODULES.map((mod) => ({
    ...mod,
    items: mod.slugs
      .map((slug) => bySlug.get(slug))
      .filter((c): c is Category => Boolean(c)),
  })).filter((row) => row.items.length > 0);

  if (rows.length === 0) return null;

  return (
    <section className="container-site pb-10 md:pb-14">
      <div className="mb-6 border-b border-border pb-4">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{t("title")}</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {rows.map((row) => (
          <div
          key={row.key}
          className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:border-primary/40"
        >
            <h3 className="mb-4 text-base font-bold">{t(row.key)}</h3>
            <ul className="space-y-1">
              {row.items.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/category/${c.slug}`}
                    className="group flex items-center justify-between gap-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="group-hover:underline">
                      {localizedName(c, locale)}
                    </span>
                    <ArrowRight className="size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 rtl:rotate-180" />
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/search"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              {t("seeAll")}
              <ArrowRight className="size-3.5 rtl:rotate-180" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}