import { getTranslations } from "next-intl/server";
import { BusinessCard } from "@/components/business-card";
import { Stagger, StaggerItem } from "@/components/motion";
import type { BusinessWithCategory } from "@/lib/queries";

export async function RelatedSection({
  businesses,
}: {
  businesses: BusinessWithCategory[];
}) {
  const t = await getTranslations("business");

  if (businesses.length === 0) return null;

  return (
    <section className="container-site py-12">
      <div className="flex items-baseline gap-2.5">
        <h2 className="text-lg font-semibold tracking-tight">{t("related")}</h2>
      </div>
      <Stagger className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {businesses.map((business) => (
          <StaggerItem key={business.id} className="h-full">
            <BusinessCard business={business} />
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
