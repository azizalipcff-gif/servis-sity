"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  exchangeRecoveryCode,
  updateUserPassword,
  validateUpdatePassword,
} from "@/lib/auth/recovery";

const fieldVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 * i, duration: 0.35 },
  }),
};

type Status = "verifying" | "ready" | "invalid" | "no-link";

export function UpdatePasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();

  const [status, setStatus] = useState<Status>("verifying");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    const sub = supabase.auth.onAuthStateChange?.((event) => {
      if (event === "PASSWORD_RECOVERY" && active) setStatus("ready");
    });

    (async () => {
      // PKCE recovery code from the email link (same-browser flow).
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error: exchangeError } = await exchangeRecoveryCode(
          supabase,
          code,
        );
        if (!active) return;
        if (exchangeError) {
          setStatus("invalid");
        } else {
          // Drop the one-time code from the URL so a reload can't re-attempt it.
          router.replace("/update-password");
          setStatus("ready");
        }
        return;
      }

      // No code in the URL: a valid recovery session may already be present.
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setStatus(data.session ? "ready" : "no-link");
    })();

    return () => {
      active = false;
      sub?.data.subscription.unsubscribe();
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = validateUpdatePassword(newPassword, confirmPassword);
    if (!result.ok) {
      setError(t(result.error));
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await updateUserPassword(
        supabase,
        newPassword,
      );
      if (authError) {
        setError(t("updatePasswordErrorGeneric"));
      } else {
        setSuccess(true);
        // Give the user a readable success state, then return to sign in.
        setTimeout(() => router.push("/login"), 4000);
      }
    } catch {
      setError(t("updatePasswordErrorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <motion.div
        custom={0}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 text-center"
      >
        <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success">
          <CheckCircle2 className="size-7" />
        </span>
        <h2 className="text-3xl font-bold tracking-tight">
          {t("passwordUpdated")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("backToLogin")}…
        </p>
        <Button asChild size="lg" className="w-full">
          <Link href="/login">
            {t("backToLogin")}
            <ArrowRight className="size-4 rtl:rotate-180" />
          </Link>
        </Button>
      </motion.div>
    );
  }

  if (status === "invalid" || status === "no-link") {
    return (
      <motion.div
        custom={0}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 text-center"
      >
        <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" />
        </span>
        <h2 className="text-3xl font-bold tracking-tight">
          {t("updatePasswordTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("updatePasswordInvalidLink")}
        </p>
        <Button asChild size="lg" className="w-full">
          <Link href="/forgot-password">
            {t("updatePasswordNewLink")}
            <ArrowRight className="size-4 rtl:rotate-180" />
          </Link>
        </Button>
      </motion.div>
    );
  }

  if (status === "verifying") {
    return (
      <div className="flex items-center justify-center py-16" role="status">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="sr-only">…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        custom={0}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
      >
        <h2 className="text-3xl font-bold tracking-tight">
          {t("updatePasswordTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("updatePasswordInstruction")}
        </p>
      </motion.div>

      <motion.div
        custom={1}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="new-password">{t("newPassword")}</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                dir="ltr"
                aria-invalid={error ? "true" : undefined}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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

          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                dir="ltr"
                aria-invalid={error ? "true" : undefined}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-11 w-full rounded-xl border border-input bg-background ps-10 pe-3 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring placeholder:text-muted-foreground/70"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("passwordRequirements")}
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={loading}
            aria-busy={loading}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {t("updatePasswordSubmit")}
          </Button>
        </form>
      </motion.div>

      <motion.div
        custom={2}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="text-center"
      >
        <Link
          href="/login"
          className="text-sm font-medium text-primary hover:text-primary/80"
        >
          {t("backToLogin")}
        </Link>
      </motion.div>
    </div>
  );
}
