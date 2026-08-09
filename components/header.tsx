import { getTranslations } from "next-intl/server";
import { LifeBuoy, MapPin, PlusCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { getCurrentUser, getCurrentProfile } from "@/lib/supabase/user";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { MobileNav } from "@/components/mobile-nav";
import { LogoutButton } from "@/components/logout-button";
import { NotificationsBell } from "@/components/notifications-bell";
import { MessengerLink } from "@/components/messenger-link";
import { HeaderBar } from "@/components/layout/header-bar";
import { HeaderSearch } from "@/components/header-search";
import { CategoryNav } from "@/components/category-nav";
import { getCategories } from "@/lib/queries";

export async function Header() {
  const t = await getTranslations("nav");
  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;
  const categories = await getCategories();

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
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <MapPin className="size-3.5" />
                <span className="font-medium text-foreground">{defaultCity}</span>
              </button>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <LifeBuoy className="size-3.5" />
                {t("help")}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href={user ? "/dashboard" : "/register"}
                className="inline-flex items-center gap-1.5 font-medium text-primary transition-colors hover:text-primary/80"
              >
                <PlusCircle className="size-4" />
                {t("forBusinesses")}
              </Link>
              <LocaleSwitcher />
            </div>
          </div>
        </div>

        {/* Tier 2 — main bar: logo + search + actions */}
        <HeaderBar>
          <div className="container-site flex h-16 items-center gap-3 lg:h-[72px]">
            <Link
              href="/"
              className="flex shrink-0 items-center lg:hidden"
              aria-label={t("home")}
            >
              <BrandLogo className="h-8 w-auto" priority />
            </Link>
            <Link href="/" className="hidden shrink-0 items-center lg:flex">
              <BrandLogo className="h-9 w-auto" priority />
            </Link>

            <div className="min-w-0 flex-1">
              <HeaderSearch />
            </div>

            <div className="flex shrink-0 items-center gap-0.5 lg:gap-1">
              {user ? (
                <>
                  <Link
                    href="/profile/favorites"
                    aria-label={t("favorites")}
                    title={t("favorites")}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <HeartIcon />
                  </Link>
                  <div className="max-lg:hidden">
                    <MessengerLink userId={user.id} />
                  </div>
                  <div className="max-sm:hidden sm:flex">
                    <NotificationsBell userId={user.id} />
                  </div>
                  <div className="hidden lg:block">
                    <LogoutButton />
                  </div>
                </>
              ) : (
                <div className="hidden items-center gap-1 lg:flex">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/login">{t("login")}</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/register">{t("register")}</Link>
                  </Button>
                </div>
              )}

              {/* Account chip */}
              <Link
                href={user ? "/profile" : "/login"}
                aria-label={user ? t("profile") : t("login")}
                className="flex h-10 items-center gap-2 rounded-full border-s border-border ps-3 lg:ps-2"
              >
                <span className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground ring-1 ring-border">
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="h-full w-full rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    initials || <UserIcon className="size-4" />
                  )}
                </span>
              </Link>
            </div>
          </div>
        </HeaderBar>

        {/* Tier 3 — category rail */}
        {categories.length > 0 && (
          <CategoryNav categories={categories} />
        )}
      </header>

      <MobileNav
        user={user ? { id: user.id } : null}
        items={[]}
        cta={{ href: "/register", label: t("register") }}
      />
    </>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? "size-5"}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}