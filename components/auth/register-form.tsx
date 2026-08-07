"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Store,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registerSchema } from "@/lib/validations/schemas";
import { useRouter, Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { MOROCCAN_CITIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";

const fieldVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 * i, duration: 0.35 },
  }),
};

export function RegisterForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [role, setRole] = useState<"owner" | "client">("owner");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = registerSchema.safeParse({
      email,
      password,
      full_name: fullName,
      phone: phone || undefined,
      city: city || undefined,
      role,
    });

    if (!parsed.success) {
      setError(tCommon("error"));
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: { full_name: parsed.data.full_name, role: parsed.data.role },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already")) {
          setError(t("errorEmailTaken"));
        } else {
          setError(t("errorGeneric"));
        }
        return;
      }

      if (parsed.data.role === "owner" && data.user) {
        await supabase
          .from("profiles")
          .update({ role: "owner" })
          .eq("id", data.user.id);
      }

      if (data.session) {
        router.push("/");
        router.refresh();
        return;
      }

      setSuccess(true);
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 rounded-3xl border bg-card p-10 text-center shadow-lg"
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
          <Check className="size-7" />
        </span>
        <h2 className="text-xl font-bold">{t("registerTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("registerSuccess")}</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div custom={0} variants={fieldVariants} initial="hidden" animate="visible">
        <h2 className="text-3xl font-bold tracking-tight">{t("registerTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("registerSubtitle")}</p>
      </motion.div>

      <motion.div custom={1} variants={fieldVariants} initial="hidden" animate="visible">
        <GoogleSignInButton />
      </motion.div>

      <motion.div
        custom={2}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center gap-4"
      >
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("orWithEmail")}
        </span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </motion.div>

      <motion.div custom={3} variants={fieldVariants} initial="hidden" animate="visible">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole("owner")}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-3.5 text-sm font-medium transition-all",
                role === "owner"
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-input text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Store className="size-5" />
              {t("registerAsOwner")}
            </button>
            <button
              type="button"
              onClick={() => setRole("client")}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-3.5 text-sm font-medium transition-all",
                role === "client"
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-input text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <UserRound className="size-5" />
              {t("registerAsClient")}
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">{t("fullName")}</Label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-11 w-full rounded-xl border border-input bg-background ps-10 pe-3 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring placeholder:text-muted-foreground/70"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                dir="ltr"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 w-full rounded-xl border border-input bg-background ps-10 pe-3 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring placeholder:text-muted-foreground/70"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 w-full rounded-xl border border-input bg-background ps-10 pe-11 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring placeholder:text-muted-foreground/70"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                className="absolute end-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">{t("phone")}</Label>
              <div className="relative">
                <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  +212
                </span>
                <input
                  id="phone"
                  type="tel"
                  dir="ltr"
                  placeholder="6 XX XX XX XX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-background ps-12 pe-3 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring placeholder:text-muted-foreground/70"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">{t("city")}</Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="city"
                  list="moroccan-cities"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-background ps-10 pe-3 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring placeholder:text-muted-foreground/70"
                />
                <datalist id="moroccan-cities">
                  {MOROCCAN_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {t("registerButton")}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {t("termsNote")}
          </p>
        </form>
      </motion.div>

      <motion.div
        custom={4}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="text-center"
      >
        <p className="text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link
            href="/login"
            className="font-semibold text-primary hover:text-primary/80"
          >
            {t("loginLink")}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}