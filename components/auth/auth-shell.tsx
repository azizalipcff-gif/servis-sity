import { getTranslations } from "next-intl/server";
import { ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/brand-logo";

const features = [
  { key: "featureVerified", icon: ShieldCheck },
  { key: "featureFast", icon: Zap },
  { key: "featurePremium", icon: Sparkles },
] as const;

export async function AuthShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("auth");
  const tCommon = await getTranslations("common");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand / marketing panel */}
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, var(--primary) 0%, #7d3f23 45%, var(--accent) 100%)",
          }}
        />
        {/* Ambient blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -end-24 size-96 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -start-24 size-[28rem] rounded-full bg-black/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "26px 26px",
          }}
        />

        {/* Brand */}
        <div className="relative z-10 flex flex-col items-start gap-3">
          <BrandLogo variant="white" className="h-10 w-auto" />
          <p className="text-xs font-medium uppercase tracking-widest text-white/70">
            {t("brandTagline")}
          </p>
        </div>

        {/* Message + floating cards */}
        <div className="relative z-10 my-12 max-w-md">
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white [text-wrap:balance]">
            {t("brandTitle")}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/85">
            {t("brandSubtitle")}
          </p>

          <ul className="mt-8 space-y-3">
            {features.map(({ key, icon: Icon }) => (
              <li key={key} className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur">
                  <Icon className="size-5 text-white" />
                </span>
                <span className="text-sm font-medium text-white/90">
                  {t(key)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Floating stat cards */}
        <div className="relative z-10 grid grid-cols-2 gap-4">
          <FloatingCard className="-rotate-1">
            <p className="text-3xl font-bold text-white">20+</p>
            <p className="mt-1 text-xs font-medium text-white/75">
              {t("statCities")}
            </p>
          </FloatingCard>
          <FloatingCard className="rotate-1 lg:translate-y-6">
            <p className="text-3xl font-bold text-white">100%</p>
            <p className="mt-1 text-xs font-medium text-white/75">
              {t("statLocal")}
            </p>
          </FloatingCard>
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

function FloatingCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}