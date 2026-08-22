"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Mail, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getProductionRecoveryRedirectUrl,
  requestPasswordReset,
  validateEmailForReset,
} from "@/lib/auth/recovery";

const fieldVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 * i, duration: 0.35 },
  }),
};

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validateEmailForReset(email)) {
      setError(t("recoveryInvalidEmail"));
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await requestPasswordReset(
        supabase,
        email.trim(),
        getProductionRecoveryRedirectUrl(),
      );

      if (authError) {
        // Never reveal whether the email exists.
        setError(t("recoveryErrorGeneric"));
      } else {
        setSuccess(true);
      }
    } catch {
      setError(t("recoveryErrorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-6">
        <motion.div
          custom={0}
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center text-center"
        >
          <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success">
            <Mail className="size-7" />
          </span>
          <h2 className="text-3xl font-bold tracking-tight">
            {t("recoveryCheckEmail")}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("recoverySent")}
          </p>
        </motion.div>

        <motion.div
          custom={1}
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
        >
          <Button asChild size="lg" className="w-full">
            <Link href="/login">
              {t("backToLogin")}
              <ArrowRight className="size-4 rtl:rotate-180" />
            </Link>
          </Button>
        </motion.div>
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
          {t("recoveryTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("recoveryInstruction")}
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
            <Label htmlFor="email">{t("email")}</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                dir="ltr"
                aria-invalid={error ? "true" : undefined}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 w-full rounded-xl border border-input bg-background ps-10 pe-3 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring placeholder:text-muted-foreground/70"
              />
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

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={loading}
            aria-busy={loading}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {t("recoverySubmit")}
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

      <motion.div
        custom={3}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="rounded-2xl border bg-muted/40 p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
              <ShieldCheck className="size-5" />
            </span>
            <p className="text-sm text-muted-foreground">{t("trustLine")}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
