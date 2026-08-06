import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/brand-logo";

export async function Footer() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");

  const quickLinks = [
    { href: "/", label: nav("home") },
    { href: "/search", label: nav("categories") },
    { href: "/pricing", label: nav("pricing") },
    { href: "/register", label: nav("forBusinesses") },
  ];

  return (
    <footer className="border-t bg-card">
      <div className="container-site grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <BrandLogo className="h-9 w-auto" />
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            {t("tagline")}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold">{t("quickLinks")}</h3>
          <ul className="mt-3 space-y-2">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">{t("contact")}</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>contact@servis-sity.ma</li>
            <li>+212 6 00 00 00 00</li>
          </ul>
        </div>
      </div>

      <div className="border-t">
        <div className="container-site flex flex-col items-center justify-between gap-3 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>{t("rights", { year: new Date().getFullYear() })}</p>
          <div className="flex gap-4">
            <span>{t("privacy")}</span>
            <span>{t("terms")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
