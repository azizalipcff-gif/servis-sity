"use client";

import { ArrowRight, Building2, Search, ShoppingBag, Wrench } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  children: React.ReactNode;
};

export function HomeSearch({ children }: Props) {
  const t = useTranslations("hero");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const query = String(form.get("q") ?? "").trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  }

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-secondary/70 via-background to-background">
        <div aria-hidden className="pointer-events-none absolute -start-40 -top-40 size-[34rem] rounded-full bg-primary/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-52 -end-40 size-[38rem] rounded-full bg-accent/10 blur-3xl" />

        <div className="container-site relative py-10 sm:py-14 lg:py-16">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              {t("eyebrow")}
            </span>

            <h1 className="mt-5 text-editorial text-4xl sm:text-5xl lg:text-[3.4rem] xl:text-6xl">{t("title")}</h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{t("subtitle")}</p>

            <form onSubmit={handleSubmit} className="mx-auto mt-7 flex max-w-3xl flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="q"
                  type="search"
                  placeholder={t("marketSearchPlaceholder")}
                  aria-label={t("marketSearchPlaceholder")}
                  className="h-12 border-0 bg-transparent ps-10 shadow-none focus-visible:ring-0"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 px-6">
                {t("searchButton")}
                <ArrowRight className="size-4 rtl:rotate-180" />
              </Button>
            </form>

            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              <Button asChild size="sm" variant="outlinePrimary">
                <a href="#marketplace-types"><Wrench className="size-4" />{t("ctaServices")}</a>
              </Button>
              <Button asChild size="sm" variant="outlinePrimary">
                <a href="#marketplace-types"><Building2 className="size-4" />{t("ctaBusinesses")}</a>
              </Button>
              <Button asChild size="sm" variant="outlinePrimary">
                <a href="#marketplace-types"><ShoppingBag className="size-4" />{t("ctaProducts")}</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {children}
    </>
  );
}
