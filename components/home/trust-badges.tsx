import { BadgeCheck, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";

const BADGES = [
  { icon: BadgeCheck, titleKey: "verified", descKey: "verifiedDesc" },
  { icon: Star, titleKey: "topRated", descKey: "topRatedDesc" },
];

export async function TrustBadges() {
  const t = await getTranslations("trust");

  return (
    <section className="border-y border-border bg-secondary/40" aria-label={t("title")}>
      <div className="container-site grid grid-cols-1 gap-6 py-10 sm:grid-cols-2">
        {BADGES.map(({ icon: Icon, titleKey, descKey }) => (
          <div key={titleKey} className="flex items-start gap-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">{t(titleKey)}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{t(descKey)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
