import { ArrowRight, Package, Store, Wrench } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const TYPES = [
  { href: "/businesses", icon: Store, key: "businesses" },
  { href: "/services", icon: Wrench, key: "services" },
  { href: "/products", icon: Package, key: "products" },
] as const;

export async function MarketplaceTypes() {
  const t = await getTranslations("homeTypes");

  return (
    <section className="border-b border-border bg-background" aria-labelledby="marketplace-types-heading">
      <div className="container-site py-10 sm:py-14">
        <h2 id="marketplace-types-heading" className="eyebrow mb-6 sm:mb-8">
          {t("eyebrow")}
        </h2>
        <div className="grid divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {TYPES.map(({ href, icon: Icon, key }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-4 px-4 py-5 transition-colors duration-200 hover:bg-card sm:gap-5 sm:px-6 sm:py-8"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary text-primary transition-colors duration-200 group-hover:bg-primary/10 sm:size-14">
                <Icon className="size-5 sm:size-6" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-base font-bold sm:text-lg">
                  {t(`title.${key}`)}
                </span>
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {t(`desc.${key}`)}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary rtl:rotate-180 rtl:group-hover:-translate-x-0.5 sm:size-5" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
