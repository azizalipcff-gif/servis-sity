import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ServiceCard } from "@/components/services/service-card";
import type { ServiceWithBusiness } from "@/lib/queries";

export async function PopularServices({ services }: { services: ServiceWithBusiness[] }) {
  const t = await getTranslations("featured");
  const visible = services.slice(0, 8);
  if (visible.length === 0) return null;
  return (
    <section className="container-wide py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5"><div><p className="eyebrow">{t("eyebrow")}</p><h2 className="mt-1 text-editorial text-2xl sm:text-3xl">{t("popularServices")}</h2></div><Link href="/services" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline">{t("viewAll")}<ArrowUpRight className="size-4 rtl:rotate-180" /></Link></div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">{visible.map((service) => <ServiceCard key={service.id} service={service} seller={service.business ? { name: service.business.name, slug: service.business.slug, logo_url: service.business.logo_url, verified: service.business.verified } : undefined} />)}</div>
    </section>
  );
}