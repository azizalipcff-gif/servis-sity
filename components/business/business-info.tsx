import { getTranslations } from "next-intl/server";
import {
  ArrowUpRight,
  Languages,
  MapPinned,
} from "lucide-react";
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

  const langs =
    locale === "ar" ? ["العربية"] : ["Arabic", "Français"];

  return (
    <section aria-labelledby="about-title">
      <div className="border-t border-border pt-8">
        <p className="eyebrow">{dt("aboutTitle")}</p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
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
            <p className="mt-4 whitespace-pre-line text-foreground/80">
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
          <Fact icon={<ArrowUpRight className="size-4 text-primary" />}>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">
              {dt("languages")}
            </dt>
            <dd className="mt-0.5 text-sm font-medium">
              {langs.join(", ")}
            </dd>
          </Fact>
          {(business.city || business.address) && (
            <Fact icon={<MapPinned className="size-4 text-primary" />}>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                {dt("serviceArea")}
              </dt>
              <dd className="mt-0.5 text-sm font-medium">
                {business.address || business.city}
              </dd>
            </Fact>
          )}
          {business.categories && (
            <Fact icon={<Languages className="size-4 text-primary" />}>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("category")}
              </dt>
              <dd className="mt-0.5 text-sm font-medium">
                {localizedName(business.categories, locale)}
              </dd>
            </Fact>
          )}
        </div>
      </div>
    </section>
  );
}

function Fact({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-3.5">
      <span className="text-primary">{icon}</span>
      <dl className="min-w-0 flex-1">{children}</dl>
    </div>
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