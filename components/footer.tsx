import { getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

export async function Footer() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");

  const explore = [
    { href: "/", label: nav("home") },
    { href: "/search", label: nav("categories") },
    { href: "/category/electricien", label: "Électricien" },
    { href: "/category/plombier", label: "Plombier" },
    { href: "/category/coiffeur", label: "Coiffeur" },
  ];

  const businesses = [
    { href: "/pricing", label: nav("pricing") },
    { href: "/dashboard", label: nav("forBusinesses") },
    { href: "/login", label: nav("login") },
  ];

  const cities = ["Casablanca", "Rabat", "Marrakech", "Tanger", "Oujda", "Berkane"];

  return (
    <footer className="mt-16 w-full">
      <div className="container-wide border-t border-border">
        {/* Statement */}
        <div className="grid gap-10 py-16 md:grid-cols-2 md:items-end">
          <Link href="/" className="text-5xl font-bold leading-none tracking-tight md:text-6xl">
            Service City
          </Link>
          <p className="max-w-sm text-lg leading-snug text-muted-foreground md:justify-self-end">
            {t("tagline")}
          </p>
        </div>

        {/* Columns */}
        <div className="grid gap-10 border-t border-border py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="eyebrow mb-4">{t("quickLinks")}</h3>
            <ul className="space-y-2.5">
              {explore.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[15px] text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="eyebrow mb-4">{t("forBusinesses")}</h3>
            <ul className="space-y-2.5">
              {businesses.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[15px] text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="eyebrow mb-4">{t("cities")}</h3>
            <ul className="flex flex-wrap gap-x-5 gap-y-2.5">
              {cities.map((c) => (
                <li key={c}>
                  <Link
                    href={`/search?city=${encodeURIComponent(c)}`}
                    className="text-[15px] text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {c}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="eyebrow mb-4">{t("contact")}</h3>
            <a
              href="mailto:contact@service-city.ma"
              className="inline-flex items-center gap-1 text-[15px] text-foreground/80 transition-colors hover:text-foreground"
            >
              contact@service-city.ma
              <ArrowUpRight className="size-4" />
            </a>
            <p className="mt-3 text-[15px] text-foreground/80" dir="ltr">
              +212 6 00 00 00 00
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-border py-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>{t("rights", { year: new Date().getFullYear() })}</p>
          <div className="flex gap-5">
            <span className="transition-colors hover:text-foreground">{t("privacy")}</span>
            <span className="transition-colors hover:text-foreground">{t("terms")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}