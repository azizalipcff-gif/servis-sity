import { getTranslations } from "next-intl/server";
import { LifeBuoy, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { getCurrentUser, getCurrentProfile } from "@/lib/supabase/user";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { MobileNav } from "@/components/mobile-nav";
import { ForBusinessesLink, HeaderAuth } from "@/components/header-auth";
import { HeaderBar } from "@/components/layout/header-bar";
import { HeaderSearch } from "@/components/header-search";
import { MainNavLinks } from "@/components/main-nav-links";
import { AllCategoriesNavButton } from "@/components/all-categories-nav-button";
import { buildSearchUrl } from "@/lib/search/url";

export async function Header() {
  const t = await getTranslations("nav");
  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;

  const initials = (profile?.full_name || user?.email || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  const defaultCity = "Casablanca";

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background">
        {/* Tier 1 — utility bar */}
        <div className="hidden border-b border-border bg-secondary/60 lg:block">
          <div className="container-site flex h-9 items-center justify-between gap-4 text-[13px]">
            <div className="flex items-center gap-5">
              <Link
                href={buildSearchUrl({ city: defaultCity })}
                className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <MapPin className="size-3.5" />
                <span className="font-medium text-foreground">{defaultCity}</span>
              </Link>
              <Link
                href="/help"
                className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <LifeBuoy className="size-3.5" />
                {t("help")}
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <ForBusinessesLink user={user ? { id: user.id } : null} />
              <LocaleSwitcher />
            </div>
          </div>
        </div>

        {/* Tier 2 — main navigation row: logo + primary links + search + all
            categories + user controls */}
        <HeaderBar>
          <div className="container-site flex h-14 items-center gap-3 lg:h-16">
            <Link
              href="/"
              className="flex shrink-0 items-center lg:hidden"
              aria-label={t("home")}
            >
              <BrandLogo className="h-7 w-auto" priority />
            </Link>
            <Link href="/" className="hidden shrink-0 items-center lg:flex">
              <BrandLogo className="h-8 w-auto" priority />
            </Link>

            <MainNavLinks />

            <div className="flex min-w-0 flex-1 items-center gap-2">
              <HeaderSearch />
              <AllCategoriesNavButton />
            </div>

            <div className="flex shrink-0 items-center gap-0.5 lg:gap-1">
              <HeaderAuth
                user={user ? { id: user.id } : null}
                profile={profile}
                initials={initials}
              />
            </div>
          </div>
        </HeaderBar>
      </header>

      <MobileNav
        user={user ? { id: user.id } : null}
        items={[]}
        cta={{ href: "/register", label: t("register") }}
      />
    </>
  );
}
