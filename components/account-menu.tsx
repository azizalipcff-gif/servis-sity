"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Heart, LayoutDashboard, MessageSquare, User } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/supabase/database.types";
import { LogoutButton } from "@/components/logout-button";

type AccountMenuProps = {
  profile: Profile | null;
  initials: string;
};

export function AccountMenu({ profile, initials }: AccountMenuProps) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const showDashboard = profile?.role === "owner" || profile?.role === "admin";

  return (
    <div ref={ref} className="relative flex size-9 items-center justify-center lg:hidden">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("profile")}
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center rounded-lg border-s border-border ps-2 ms-0.5 transition-colors hover:bg-muted"
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
            initials
          )}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("profile")}
          className="absolute end-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-card p-1.5 shadow-lg"
        >
          <MenuItem
            icon={User}
            href="/profile"
            label={t("profile")}
            onNavigate={() => setOpen(false)}
          />
          {showDashboard && (
            <MenuItem
              icon={LayoutDashboard}
              href="/dashboard"
              label={t("dashboard")}
              onNavigate={() => setOpen(false)}
            />
          )}
          <MenuItem
            icon={Heart}
            href="/profile/favorites"
            label={t("favorites")}
            onNavigate={() => setOpen(false)}
          />
          <MenuItem
            icon={MessageSquare}
            href="/messenger"
            label={t("messenger")}
            onNavigate={() => setOpen(false)}
          />
          <div className="my-1 h-px bg-border" role="separator" />
          <LogoutButton className="w-full justify-start rounded-lg px-3 py-2 text-sm" />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  href,
  label,
  onNavigate,
}: {
  icon: typeof User;
  href: string;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted",
      )}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{label}</span>
    </Link>
  );
}