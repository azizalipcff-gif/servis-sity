"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/auth/google-icon";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton({ returnTo }: { returnTo?: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const safeReturnTo =
        returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
          ? returnTo
          : "/dashboard";
      // Carry the *current* locale so the post-login redirect lands in the
      // same locale the user was browsing instead of the default locale.
      const nextPath = `/${locale}${safeReturnTo}`;
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) {
        setError(t("errorGeneric"));
      }
    } catch {
      setError(t("errorOauthUnavailable"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        {loading ? (
          <span className="size-4 animate-spin rounded-full border-2 border-foreground/25 border-t-foreground" />
        ) : (
          <GoogleIcon className="size-5" />
        )}
        {loading ? t("signingIn") : t("googleButton")}
      </Button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}