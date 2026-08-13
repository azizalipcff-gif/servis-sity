import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Inter, Tajawal } from "next/font/google";
import { routing } from "@/i18n/routing";
import { dirForLocale } from "@/lib/translations";
import { siteUrl, hreflangLocales } from "@/lib/seo";
import { Providers } from "@/components/providers";
import "@/app/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const tajawal = Tajawal({
  subsets: ["latin", "arabic"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-tajawal",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#e07a2d",
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "a11y" });
  const skipLinkLabel = t("skipToContent");

  return (
    <html lang={locale} dir={dirForLocale(locale as "ar" | "fr" | "en")}>
      <body
        className={`min-h-screen bg-background text-foreground antialiased ${inter.variable} ${tajawal.variable}`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        >
          {skipLinkLabel}
        </a>
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    return { title: "Service City" };
  }

  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: t("title"),
      template: "%s | Service City",
    },
    description: t("description"),
    icons: {
      icon: [
        {
          url: "/branding/icon-192.png",
          type: "image/png",
          sizes: "192x192",
        },
        {
          url: "/branding/icon-512.png",
          type: "image/png",
          sizes: "512x512",
        },
        "/favicon.ico",
      ],
      apple: {
        url: "/branding/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    },
    manifest: "/manifest.webmanifest",
    applicationName: "Service City",
    appleWebApp: {
      capable: true,
      title: "Service City",
      statusBarStyle: "default",
    },
    openGraph: {
      type: "website",
      locale: hreflangLocales[locale] ?? locale,
      siteName: t("title"),
      title: t("title"),
      description: t("description"),
      images: [
        {
          url: "/branding/service-city-logo.png",
          width: 1536,
          height: 1024,
          alt: "Service City Logo",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["/branding/service-city-logo.png"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
      },
    },
  };
}
