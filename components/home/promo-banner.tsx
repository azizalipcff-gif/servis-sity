import { ArrowRight, Store } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export async function PromoBanner() {
  const t = await getTranslations("promo");

  return (
    <section className="container-site py-10 md:py-14">
      <div className="relative overflow-hidden rounded-2xl bg-foreground px-6 py-12 text-background md:px-12 md:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, var(--primary) 0, transparent 40%), radial-gradient(circle at 85% 80%, var(--accent) 0, transparent 40%)",
          }}
        />
        <div className="relative grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-background/60">
              <Store className="size-4 text-primary" />
              {t("eyebrow")}
            </p>
            <h2 className="max-w-xl text-3xl font-bold leading-tight md:text-4xl">
              {t("title")}
            </h2>
            <p className="mt-3 max-w-lg text-base text-background/70">
              {t("subtitle")}
            </p>
          </div>
          <Button asChild size="lg" className="px-7 text-base">
            <Link href="/dashboard">
              {t("cta")}
              <ArrowRight className="size-5 rtl:rotate-180" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}