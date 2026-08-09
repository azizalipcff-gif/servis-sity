import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  MapPin,
  Phone,
  Globe,
  Award,
  Pencil,
  AtSign,
  Share2,
  Music2,
  MessageCircle,
  GraduationCap,
  User,
  type LucideIcon,
} from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/user";
import type { Profile } from "@/lib/supabase/database.types";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function initials(profile: Profile) {
  return (profile.full_name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("profile");
  const profile = await getCurrentProfile();

  if (!profile) return null;

  const socials: { label: string; href: string; icon: LucideIcon }[] = [];
  if (profile.facebook) socials.push({ label: "Facebook", href: profile.facebook, icon: AtSign });
  if (profile.instagram) socials.push({ label: "Instagram", href: profile.instagram, icon: Share2 });
  if (profile.linkedin) socials.push({ label: "LinkedIn", href: profile.linkedin, icon: User });
  if (profile.tiktok) socials.push({ label: "TikTok", href: profile.tiktok, icon: Music2 });
  if (profile.whatsapp) socials.push({ label: "WhatsApp", href: profile.whatsapp, icon: MessageCircle });

  const joined = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
      })
    : "";

  const info: { icon: LucideIcon; text: string }[] = [];
  if (profile.city) info.push({ icon: MapPin, text: profile.city });
  if (profile.phone) info.push({ icon: Phone, text: profile.phone });
  if (profile.website) info.push({ icon: Globe, text: profile.website });
  if (profile.experience) info.push({ icon: Award, text: profile.experience });
  if (profile.languages) info.push({ icon: MessageCircle, text: profile.languages });
  if (profile.skills) info.push({ icon: User, text: profile.skills });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="border-y border-border">
        {/* Cover */}
        <div className="relative aspect-[3/1] max-h-64 w-full overflow-hidden bg-muted">
          {profile.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.cover_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(135deg,var(--muted),var(--background))]" />
          )}
        </div>

        <div className="px-5 pb-6 sm:px-8">
          {/* Avatar + settings */}
          <div className="-mt-14 flex items-end gap-4">
            <div className="relative flex h-24 w-24 shrink-0 overflow-hidden rounded-full bg-muted shadow-md ring-4 ring-white">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || "avatar"}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-muted-foreground">
                  {initials(profile)}
                </div>
              )}
            </div>
            <Link
              href="/profile/settings"
              className="ms-auto inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-foreground"
            >
              <Pencil className="size-3.5" />
              {t("tabSettings")}
            </Link>
          </div>

          {/* Name/role */}
          <div className="mt-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight">
                {profile.full_name || "—"}
              </h2>
              {profile.role === "admin" && (
                <Badge className="gap-1">
                  <GraduationCap className="size-3.5" />
                  {t("adminRole")}
                </Badge>
              )}
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t(profile.role === "owner" ? "roleOwner" : "roleClient")}
              {joined ? ` — ${t("joinedSince", { date: joined })}` : ""}
            </p>
          </div>

          {/* Bio */}
          <p className="mt-5 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/80">
            {profile.bio || t("noBio")}
          </p>

          {/* Info grid */}
          {info.length > 0 && (
            <div className="mt-6 grid gap-0 border-t border-border sm:grid-cols-2">
              {info.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 border-b border-border py-3 text-sm sm:odd:pe-4 sm:even:ps-4"
                >
                  <item.icon className="size-4 shrink-0 text-primary" />
                  <span className="truncate text-foreground/80">{item.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Socials */}
          {socials.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <s.icon className="size-3.5" />
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}