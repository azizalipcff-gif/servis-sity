import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { getCurrentUser, getCurrentProfile } from "@/lib/supabase/user";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { MobileNav } from "@/components/mobile-nav";
import { LogoutButton } from "@/components/logout-button";

export async function Header() {
  const t = await getTranslations("nav");
  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;
  const isAdmin = profile?.role === "admin";

  const items = [
    { href: "/", label: t("home") },
    { href: "/search", label: t("categories") },
    { href: "/pricing", label: t("pricing") },
  ];

  if (user) {
    items.push({ href: "/dashboard", label: t("dashboard") });
  }
  if (isAdmin) {
    items.push({ href: "/admin", label: t("admin") });
  }

  const cta = user
    ? { href: "/dashboard", label: t("dashboard") }
    : { href: "/register", label: t("register") };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur">
      <div className="container-site flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex shrink-0 items-center">
          <BrandLogo className="h-8 w-auto md:h-9" priority />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/75 transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          {user ? (
            <>
              <Link href="/dashboard" className="hidden md:block">
                <Button size="sm">{t("dashboard")}</Button>
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="hidden md:block">
                <Button variant="ghost" size="sm">
                  {t("login")}
                </Button>
              </Link>
              <Link href="/register" className="hidden md:block">
                <Button size="sm">{t("register")}</Button>
              </Link>
            </>
          )}
          <div className="md:hidden">
            <MobileNav items={items} cta={cta} />
          </div>
        </div>
      </div>
    </header>
  );
}
