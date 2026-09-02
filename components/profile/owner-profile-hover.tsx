"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BriefcaseBusiness, Globe, Languages, MapPin, UserRound } from "lucide-react";
import { SmartImage } from "@/components/smart-image";
import { DEFAULT_PLACEHOLDER_IMAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type OwnerProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  city: string | null;
  bio: string | null;
  avatar_url: string | null;
  website: string | null;
  languages: string | null;
  skills: string | null;
  experience: string | null;
};

type Props = {
  ownerId: string | null | undefined;
  businessName?: string | null;
  children: ReactNode;
  className?: string;
};

export function OwnerProfileHover({ ownerId, businessName, children, className }: Props) {
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);

  async function loadProfile() {
    if (!ownerId || loaded.current || loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/public/owner-profile/${ownerId}`, { cache: "force-cache" });
      if (!response.ok) return;
      const data = (await response.json()) as OwnerProfile;
      setProfile(data);
      loaded.current = true;
    } catch {
      // Preview is intentionally non-blocking.
    } finally {
      setLoading(false);
    }
  }

  function show() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setOpen(true);
      void loadProfile();
    }, 120);
  }

  function hide() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 160);
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <div className={cn("relative inline-flex min-w-0", className)} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      <div
        role="button"
        tabIndex={0}
        className="inline-flex min-w-0 cursor-pointer items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        aria-label={businessName ? `View ${businessName} owner profile` : "View owner profile"}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void loadProfile();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((value) => !value);
            if (!open) void loadProfile();
          }
        }}
      >
        {children}
      </div>

      {open && (
        <div role="dialog" aria-label="Owner profile preview" className="absolute start-0 top-full z-[80] mt-2 w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl" onMouseEnter={show} onMouseLeave={hide}>
          <div className="relative h-20 overflow-hidden bg-muted">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--foreground),color-mix(in_oklab,var(--primary)_70%,var(--foreground)))] opacity-90" />
          </div>
          <div className="px-4 pb-4">
            <div className="-mt-7 flex items-end gap-3">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-full border-4 border-card bg-muted shadow-lg">
                <SmartImage src={profile?.avatar_url} alt="" fallback={DEFAULT_PLACEHOLDER_IMAGES.logo} className="size-full" imgClassName="object-cover" />
              </span>
              <div className="min-w-0 pb-0.5">
                <p className="truncate font-semibold">{profile?.full_name || businessName || "Owner"}</p>
                {profile?.username && <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>}
              </div>
            </div>
            {loading && !profile ? (
              <div className="mt-4 space-y-2">
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            ) : profile ? (
              <div className="mt-3 space-y-2 text-sm">
                {profile.bio && <p className="line-clamp-3 leading-relaxed text-muted-foreground">{profile.bio}</p>}
                <div className="grid gap-1.5 text-xs text-muted-foreground">
                  {profile.city && <span className="inline-flex items-center gap-2"><MapPin className="size-3.5 shrink-0 text-primary" />{profile.city}</span>}
                  {profile.experience && <span className="inline-flex items-center gap-2"><BriefcaseBusiness className="size-3.5 shrink-0 text-primary" />{profile.experience}</span>}
                  {profile.languages && <span className="inline-flex items-center gap-2"><Languages className="size-3.5 shrink-0 text-primary" />{profile.languages}</span>}
                  {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-2 truncate text-primary hover:underline" onClick={(event) => event.stopPropagation()}><Globe className="size-3.5 shrink-0" /><span className="truncate">{profile.website}</span></a>}
                </div>
                {profile.skills && <div className="border-t border-border pt-2 text-xs text-muted-foreground"><span className="me-1 inline-flex items-center gap-1 font-medium text-foreground"><UserRound className="size-3" />Skills:</span>{profile.skills}</div>}
              </div>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">Owner profile details are not publicly available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
