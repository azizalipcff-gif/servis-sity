/**
 * Password-recovery flow helpers.
 *
 * Kept free of `@/`-aliased imports and the Supabase SDK so the logic is
 * unit-testable with a tiny hand-rolled mock client under `node`. The real
 * Supabase browser client satisfies the structural `ResetClient` /
 * `RecoveryClient` interfaces used here.
 */

import { emailSchema, passwordSchema } from "../validations/schemas.ts";

export type AuthResult = { error: { message: string } | null };

/** Anything exposing the slice of `supabase.auth` the reset flow needs. */
export interface ResetClient {
  auth: {
    resetPasswordForEmail: (
      email: string,
      options: { redirectTo: string },
    ) => Promise<AuthResult>;
  };
}

export interface RecoveryClient {
  auth: {
    exchangeCodeForSession: (code: string) => Promise<AuthResult>;
    getSession: () => Promise<{ data: { session: unknown | null } }>;
    updateUser: (attrs: { password: string }) => Promise<AuthResult>;
    onAuthStateChange?: (
      cb: (event: string, session: unknown) => void,
    ) => { data: { subscription: { unsubscribe: () => void } } };
  };
}

/** Absolute URL the recovery email link points to (no locale prefix; the
 *  i18n middleware adds the locale when the link is opened). */
export function buildRecoveryRedirectUrl(baseUrl: string): string {
  const cleaned = (baseUrl ?? "").replace(/\/+$/, "");
  return `${cleaned}/update-password`;
}

/** Production redirect URL, sourced from the same env config as `lib/seo`
 *  (NEXT_PUBLIC_APP_URL ?? NEXT_PUBLIC_SITE_URL ?? Vercel fallback). Never
 *  hardcodes localhost — same-origin as the deployed app. */
export function getProductionRecoveryRedirectUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://servis-sity-iwtr.vercel.app";
  return buildRecoveryRedirectUrl(base);
}

export function validateEmailForReset(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; error: "passwordRequirements" | "passwordMismatch" };

/** Enforce the project's existing password rules (min 6 / max 72) and that
 *  both fields match. */
export function validateUpdatePassword(
  newPassword: string,
  confirmPassword: string,
): PasswordValidationResult {
  const parsed = passwordSchema.safeParse(newPassword);
  if (!parsed.success) return { ok: false, error: "passwordRequirements" };
  if (newPassword !== confirmPassword)
    return { ok: false, error: "passwordMismatch" };
  return { ok: true };
}

export async function requestPasswordReset(
  supabase: ResetClient,
  email: string,
  redirectTo: string,
): Promise<AuthResult> {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function exchangeRecoveryCode(
  supabase: RecoveryClient,
  code: string,
): Promise<AuthResult> {
  return supabase.auth.exchangeCodeForSession(code);
}

export async function updateUserPassword(
  supabase: RecoveryClient,
  password: string,
): Promise<AuthResult> {
  return supabase.auth.updateUser({ password });
}
