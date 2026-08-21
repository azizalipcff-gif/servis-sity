import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { parseSearchParams } from "@/lib/search/url";
import { getCategories } from "@/lib/queries";
import { getSearchIndex } from "@/lib/search/index";
import { siteUrl } from "@/lib/seo";
import { SearchExplorer } from "@/components/search/search-explorer";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [initial, categories] = await Promise.all([
    parseSearchParams(await searchParams),
    getCategories(),
  ]);

  // Empty text + no deep-link scope => serve the simple landing feeds.
  const needsIndex = !initial.q && !initial.city && !initial.category;
  const index = needsIndex ? await getSearchIndex(null) : null;

  return (
    <div className="pb-16">
      <SearchExplorer
        categories={categories}
        index={index}
        initial={{
          q: initial.q,
          city: initial.city,
          category: initial.category,
        }}
      />
    </div>
  );
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const [t, meta] = await Promise.all([
    getTranslations({ locale, namespace: "search" }),
    getTranslations({ locale, namespace: "meta" }),
  ]);

  const q = initialQ(sp);
  const title = q ? `${q} — ${meta("title")}` : `${t("title")} — ${meta("title")}`;

  const canonical = new URL(`/${locale}/search`, siteUrl());
  if (q) canonical.search = new URLSearchParams({ q }).toString();

  return {
    title,
    description: t("subtitle"),
    alternates: { canonical: canonical.toString() },
    robots: q ? { index: false, follow: true } : undefined,
  };
}

function initialQ(sp: Record<string, string | string[] | undefined>): string {
  const v = sp.q;
  return typeof v === "string" && v.length > 0 ? v.trim() : "";
}