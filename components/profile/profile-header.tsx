import { CalendarDays, MapPin, Pencil, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddContentButton } from "@/components/profile/add-content-dialog";
import { SmartImage } from "@/components/smart-image";
import type { Profile } from "@/lib/supabase/database.types";

function initials(profile: Profile | null) {
  const text = profile?.full_name || profile?.username || "?";
  return text
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

export async function ProfileHeader({
  profile,
  hasBusiness,
  locale,
}: {
  profile: Profile | null;
  hasBusiness: boolean;
  locale: string;
}) {
  const t = await getTranslations("workspace");

  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
      })
    : null;

  const roleLabel =
    profile?.role === "admin"
      ? t("roleAdmin")
      : profile?.role === "owner"
        ? t("roleOwner")
        : t("roleClient");

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      {/* Cover */}
      <div className="relative aspect-[4/1] w-full overflow-hidden bg-[linear-gradient(135deg,var(--foreground)_10%,color-mix(in_oklab,var(--foreground)_68%,var(--primary))_100%)] sm:aspect-[6/1]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 82% 10%, color-mix(in oklab, var(--gold) 55%, transparent) 0, transparent 42%)",
          }}
        />
        {profile?.cover_url ? (
          <SmartImage
            src={profile.cover_url}
            alt=""
            sizes="100vw"
            className="absolute inset-0 h-full w-full"
            imgClassName="object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 18% 85%, var(--primary) 0, transparent 45%)",
            }}
          />
        )}
      </div>

      {/* Identity */}
      <div className="px-5 pb-6 sm:px-8 sm:pb-7">
        <div className="-mt-14 flex items-end gap-4 sm:-mt-16">
          <div className="relative size-28 shrink-0 overflow-hidden rounded-full border-4 border-background bg-muted shadow-lift sm:size-32">
            {profile?.avatar_url ? (
              <SmartImage
                src={profile.avatar_url}
                alt={profile?.full_name || "avatar"}
                className="size-full"
                imgClassName="object-cover"
              />
            ) : (
              <span className="grid size-full place-items-center bg-[linear-gradient(135deg,var(--foreground),color-mix(in_oklab,var(--foreground)_65%,var(--primary)))] text-4xl font-bold text-background">
                {initials(profile)}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {profile?.full_name || profile?.username || "—"}
              </h1>
              <Badge
                variant={
                  profile?.role === "admin"
                    ? "premium"
                    : profile?.role === "owner"
                      ? "secondary"
                      : "outline"
                }
              >
                {roleLabel}
              </Badge>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {profile?.city && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 shrink-0 text-primary" />
                  {profile.city}
                </span>
              )}
              {joined && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4 shrink-0 text-primary" />
                  {t("memberSince", { date: joined })}
                </span>
              )}
              {profile?.phone && (
                <span className="inline-flex items-center gap-1.5" dir="ltr">
                  <Phone className="size-4 shrink-0 text-primary" />
                  {profile.phone}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/profile/settings">
                <Pencil className="size-4" />
                {t("editProfile")}
              </Link>
            </Button>
            <AddContentButton hasBusiness={hasBusiness} />
          </div>
        </div>

        {profile?.bio && (
          <p className="mt-4 max-w-2xl whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/80">
            {profile.bio}
          </p>
        )}
      </div>
    </section>
  );
}