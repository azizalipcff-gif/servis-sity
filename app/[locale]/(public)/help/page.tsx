import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import type { Locale } from "@/lib/translations";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { absoluteUrl, localizedLanguages } from "@/lib/seo";
import { Search, Tag, Store, Mail, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "helpPage" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical: absoluteUrl(`/${locale}/help`),
      languages: localizedLanguages(`/help`),
    },
    openGraph: {
      title: t("title"),
      description: t("subtitle"),
      url: absoluteUrl(`/${locale}/help`),
      siteName: "Service City",
      images: [{ url: absoluteUrl("/branding/service-city-logo.png") }],
    },
  };
}

export default async function HelpPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const t = await getTranslations("helpPage");
  const links = t.raw("links") as {
    searchTitle: string;
    searchDesc: string;
    searchCta: string;
    pricingTitle: string;
    pricingDesc: string;
    pricingCta: string;
    listTitle: string;
    listDesc: string;
    listCta: string;
  };
  const faq = t.raw("faq") as { q: string; a: string }[];

  const cards = [
    {
      href: "/search",
      icon: Search,
      title: links.searchTitle,
      desc: links.searchDesc,
      cta: links.searchCta,
    },
    {
      href: "/pricing",
      icon: Tag,
      title: links.pricingTitle,
      desc: links.pricingDesc,
      cta: links.pricingCta,
    },
    {
      href: "/register",
      icon: Store,
      title: links.listTitle,
      desc: links.listDesc,
      cta: links.listCta,
    },
  ];

  return (
    <div className="container-site py-14">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
      </div>

      <h2 className="mt-12 text-xl font-semibold">{t("quickLinksTitle")}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.href}>
              <CardHeader>
                <div className="flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Icon className="size-5" />
                </div>
                <CardTitle className="mt-3">{card.title}</CardTitle>
                <CardDescription>{card.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm">
                  <Link href={card.href}>{card.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <h2 className="mt-12 text-xl font-semibold">{t("faqTitle")}</h2>
      <div className="mt-4 divide-y divide-border rounded-2xl border border-border">
        {faq.map((item, i) => (
          <details key={i} className="group p-4">
            <summary className="cursor-pointer list-none font-medium">
              {item.q}
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-border p-6">
        <h2 className="text-xl font-semibold">{t("supportTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("supportDesc")}</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:gap-8">
          <a
            href="mailto:servicecitymr@gmail.com"
            className="inline-flex items-center gap-2 text-[15px] text-foreground/80 transition-colors hover:text-foreground"
          >
            <Mail className="size-4" />
            servicecitymr@gmail.com
          </a>
          <a
            href="tel:0693793458"
            className="inline-flex items-center gap-2 text-[15px] text-foreground/80 transition-colors hover:text-foreground"
            dir="ltr"
          >
            <Phone className="size-4" />
            0693793458
          </a>
        </div>
      </div>
    </div>
  );
}
