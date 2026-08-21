"use client";

import { useEffect, useState } from "react";
import { PlusCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/account-menu";
import { NotificationsBell } from "@/components/notifications-bell";
import { MessengerLink } from "@/components/messenger-link";
import { LogoutButton } from "@/components/logout-button";
import type { Profile } from "@/lib/supabase/database.types";

type UserSeed = { id: string } | null;

/**
 * Auth-dependent header UI, driven by the SERVER-resolved session.
 *
 * The Supabase auth cookie is HttpOnly, so the browser client cannot read it
 * during hydration — if client components re-resolve the session on first
 * render they would see `null` while the server saw a user, and React would
 * throw a hydration mismatch (server: logged-in avatar/link, client: login
 * button). The session resolves into state seeded from the server prop, so the
 * first client render is byte-identical to the SSR output; any real session
 * change is picked up in an effect after mount.
 */

function useServerUser(serverUser: UserSeed): UserSeed {
  const [user, setUser] = useState<UserSeed>(serverUser);

  useEffect(() => {
    let disposed = false;
    import("@/lib/supabase/client")
      .then((mod) =>
        mod
          .createClient()
          .auth.getUser()
          .then(({ data }) => {
            if (disposed) return;
            setUser((prev) =>
              prev && data.user ? prev : (data.user as { id: string } | null) ?? null,
            );
          }),
      )
      .catch(() => {
        /* offline / unconfigured — keep the server-provided state */
      });
    return () => {
      disposed = true;
    };
  }, [serverUser]);

  return user;
}

export function ForBusinessesLink({ user }: { user: UserSeed }) {
  const t = useTranslations("nav");
  const resolved = useServerUser(user) ? user : null;
  return (
    <Link
      href={resolved ? "/dashboard" : "/register"}
      className="inline-flex items-center gap-1.5 font-medium text-primary transition-colors hover:text-primary/80"
    >
      <PlusCircle className="size-4" />
      {t("forBusinesses")}
    </Link>
  );
}

export function HeaderAuth({
  user,
  profile,
  initials,
}: {
  user: UserSeed;
  profile: Profile | null;
  initials: string;
}) {
  const t = useTranslations("nav");
  const resolved = useServerUser(user);

  if (!resolved) {
    return (
      <div className="flex shrink-0 items-center gap-0.5 lg:gap-1">
        <div className="hidden items-center gap-1 lg:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">{t("login")}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">{t("register")}</Link>
          </Button>
        </div>

        {/* Logged-out mobile account chip */}
        <Link
          href="/login"
          aria-label={t("login")}
          className="flex size-9 items-center justify-center rounded-lg lg:hidden"
        >
          <UserIcon className="size-4" />
        </Link>

        {/* Logged-out desktop account chip */}
        <Link
          href="/login"
          aria-label={t("login")}
          className="hidden size-9 items-center justify-center rounded-lg lg:flex"
        >
          <span className="grid size-7 place-items-center rounded-full bg-secondary ring-1 ring-border">
            <UserIcon className="size-3.5" />
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-0.5 lg:gap-1">
      <Link
        href="/profile/favorites"
        aria-label={t("favorites")}
        title={t("favorites")}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <HeartIcon className="size-[18px]" />
      </Link>
      <div className="max-lg:hidden">
        <MessengerLink userId={resolved.id} />
      </div>
      <div className="max-sm:hidden sm:flex">
        <NotificationsBell userId={resolved.id} />
      </div>
      <div className="hidden lg:block">
        <LogoutButton />
      </div>

      {/* Desktop account chip */}
      <Link
        href="/profile"
        aria-label={t("profile")}
        className="hidden size-9 items-center justify-center rounded-lg lg:flex"
      >
        <span className="grid size-7 place-items-center overflow-hidden rounded-full bg-secondary text-xs font-bold text-secondary-foreground ring-1 ring-border">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-full w-full rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            initials || <UserIcon className="size-3.5" />
          )}
        </span>
      </Link>

      {/* Mobile account menu */}
      <AccountMenu profile={profile} initials={initials} />
    </div>
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? "size-[18px]"}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}