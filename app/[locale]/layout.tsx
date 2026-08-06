import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { dirForLocale } from "@/lib/translations";
import { siteUrl, hreflangLocales } from "@/lib/seo";
import { Providers } from "@/components/providers";
import "@/app/globals.css";

export const viewport: Viewport = {
  themeColor: "#bf5b32",
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

  return (
    <html lang={locale} dir={dirForLocale(locale as "ar" | "fr" | "en")}>
      <body className="min-h-screen bg-background text-foreground antialiased">
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
    return { title: "Servis Sity" };
  }

  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta" });

  const alternates = Object.entries(hreflangLocales).reduce<
    Record<string, string>
  >((acc, [loc]) => {
    acc[loc] = absolutePath(loc, "");
    return acc;
  }, {});

  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: t("title"),
      template: "%s | Servis Sity",
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
    applicationName: "Servis Sity",
    appleWebApp: {
      capable: true,
      title: "Servis Sity",
      statusBarStyle: "default",
    },
    alternates: {
      canonical: absolutePath(locale, ""),
      languages: {
        ...alternates,
        "x-default": absolutePath("en", ""),
      },
    },
    openGraph: {
      type: "website",
      locale: hreflangLocales[locale] ?? locale,
      url: absolutePath(locale, ""),
      siteName: t("title"),
      title: t("title"),
      description: t("description"),
      images: [
        {
          url: "/branding/servis-sity-logo.png",
          width: 1536,
          height: 1024,
          alt: "Servis Sity Logo",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["/branding/servis-sity-logo.png"],
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

function absolutePath(locale: string, path: string): string {
  return `${siteUrl()}/${locale}${path}`;
}
