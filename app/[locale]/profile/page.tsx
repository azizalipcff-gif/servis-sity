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

export default async function ProfilePage() {
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
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
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
      <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        {/* Cover */}
        <div className="relative h-40 bg-gradient-to-br from-primary/20 via-primary/5 to-accent/20 sm:h-52">
          {profile.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.cover_url}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          )}
        </div>

        <div className="px-5 pb-6 sm:px-8">
          {/* Avatar */}
          <div className="-mt-14 flex flex-wrap items-end gap-4">
            <div className="flex h-28 w-28 overflow-hidden rounded-2xl bg-muted ring-4 ring-card">
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
            <Link href="/profile/settings" className="ml-auto">
              <Badge variant="outline" className="gap-1.5 py-1.5">
                <Pencil className="h-3.5 w-3.5" />
                {t("tabSettings")}
              </Badge>
            </Link>
          </div>

          {/* Name */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">
              {profile.full_name || "—"}
            </h2>
            {profile.role === "admin" && (
              <Badge className="gap-1">
                <GraduationCap className="h-3.5 w-3.5" />
                {t("adminRole")}
              </Badge>
            )}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {t(profile.role === "owner" ? "roleOwner" : "roleClient")}
            {joined ? ` — ${t("joinedSince", { date: joined })}` : ""}
          </p>

          {/* Bio */}
          {profile.bio ? (
            <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
              {profile.bio}
            </p>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">{t("noBio")}</p>
          )}

          {/* Info grid */}
          {info.length > 0 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {info.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5 text-sm"
                >
                  <item.icon className="h-4 w-4 shrink-0 text-primary" />
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
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <s.icon className="h-3.5 w-3.5" />
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