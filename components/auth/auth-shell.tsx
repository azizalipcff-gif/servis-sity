import { getTranslations } from "next-intl/server";
import { ShieldCheck, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/brand-logo";

const features = [
  { key: "featureVerified", icon: ShieldCheck },
  { key: "featureFast", icon: Zap },
] as const;

export async function AuthShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("auth");
  const tCommon = await getTranslations("common");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Editorial brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-foreground p-10 text-background lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_55%)]"
        />
        <div className="relative flex flex-col items-start gap-3">
          <BrandLogo variant="white" className="h-10 w-auto" />
          <p className="text-xs font-medium uppercase tracking-widest text-background/60">
            {t("brandTagline")}
          </p>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-editorial text-5xl leading-[1.02] ">
            {t("brandTitle")}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-background/70">
            {t("brandSubtitle")}
          </p>

          <ul className="mt-10">
            {features.map(({ key, icon: Icon }) => (
              <li
                key={key}
                className="flex items-center gap-3 border-t border-background/15 py-4"
              >
                <Icon className="size-5 text-background/70" />
                <span className="text-sm font-medium">{t(key)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center gap-10 border-t border-background/15 pt-6">
            <div>
              <p className="text-editorial text-4xl">20+</p>
              <p className="mt-1 text-xs font-medium text-background/60">
                {t("statCities")}
              </p>
            </div>
            <div>
              <p className="text-editorial text-4xl">100%</p>
              <p className="mt-1 text-xs font-medium text-background/60">
                {t("statLocal")}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Form column */}
      <section className="relative flex flex-col">
        {/* Mobile brand header */}
        <div className="flex items-center justify-between px-5 pt-6 lg:hidden">
          <Link href="/" className="flex items-center">
            <BrandLogo className="h-9 w-auto" />
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {tCommon("back")}
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>

        <p className="px-6 pb-6 text-center text-xs text-muted-foreground">
          {t("footerNote")}
        </p>
      </section>
    </div>
  );
}