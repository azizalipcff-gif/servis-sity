import { ArrowRight, Building2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BusinessCard } from "@/components/business-card";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import type { BusinessWithCategory } from "@/lib/queries";

export async function FeaturedBusinesses({
  businesses,
}: {
  businesses: BusinessWithCategory[];
}) {
  const t = await getTranslations("featured");

  return (
    <section className="bg-card/50 py-16">
      <div className="container-site">
        <FadeIn>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">{t("title")}</h2>
              <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
            </div>
            {businesses.length > 0 && (
              <Link
                href="/search"
                className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex"
              >
                {t("viewAll")}
                <ArrowRight className="size-4 rtl:rotate-180" />
              </Link>
            )}
          </div>
        </FadeIn>

        {businesses.length === 0 ? (
          <FadeIn delay={0.1}>
            <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-background py-16 text-center">
              <Building2 className="size-10 text-muted-foreground/50" />
              <p className="max-w-sm text-sm text-muted-foreground">
                {t("empty")}
              </p>
              <Link href="/register" className="mt-2">
                <span className="text-sm font-semibold text-primary hover:underline">
                  {t("viewAll")}
                </span>
              </Link>
            </div>
          </FadeIn>
        ) : (
          <Stagger className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {businesses.map((business) => (
              <StaggerItem key={business.id} className="h-full">
                <BusinessCard business={business} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </section>
  );
}
