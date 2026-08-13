import { getTranslations } from "next-intl/server";
import { localizedName, type Locale } from "@/lib/translations";
import type { BusinessDetail } from "@/lib/queries";

export async function BusinessInfo({
  business,
  locale,
}: {
  business: BusinessDetail;
  locale: Locale;
}) {
  const t = await getTranslations("business");
  const dt = await getTranslations("business.detail");

  const description = business.description?.trim();
  const summary = description
    ? sentenceSummary(description)
    : null;

  const langs = business.languages?.trim();

  return (
    <section aria-labelledby="about-title">
      <h2
        id="about-title"
        className="flex items-baseline gap-2.5 text-lg font-semibold tracking-tight"
      >
        {dt("aboutTitle")}
      </h2>

      <div className="mt-6 grid gap-8 lg:grid-cols-3 lg:gap-10">
        <div className="lg:col-span-2">
          {summary && (
            <div className="border-s border-primary ps-4">
              <p className="text-sm font-medium uppercase tracking-wider text-primary">
                {dt("summary")}
              </p>
              <p className="mt-1.5 text-xl font-medium leading-relaxed">
                {summary}
              </p>
            </div>
          )}
          {description && (
            <p className="mt-4 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-foreground/80">
              {description}
            </p>
          )}
          {!description && (
            <p className="text-muted-foreground">
              {t("descriptionEmpty")}
            </p>
          )}
        </div>

        <div className="space-y-0">
          {langs && <Fact label={dt("languages")}>{langs}</Fact>}
          {(business.city || business.address) && (
            <Fact label={dt("serviceArea")}>
              {business.address || business.city}
            </Fact>
          )}
          {business.categories && (
            <Fact label={t("category")}>
              {localizedName(business.categories, locale)}
            </Fact>
          )}
        </div>
      </div>
    </section>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <dl className="flex items-baseline justify-between gap-4 border-b border-border/60 py-3 first:border-t">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-end text-sm font-medium text-foreground/90">
        {children}
      </dd>
    </dl>
  );
}

function sentenceSummary(description: string): string {
  const clean = description.replace(/\s+/g, " ").trim();
  const firstSentence = clean
    .split(/(?<=[.!?])\s+/)
    .find((s) => s.length > 0);
  const base = firstSentence || clean;
  return base.length > 200 ? `${base.slice(0, 200)}…` : base;
}