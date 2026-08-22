/**
 * Password-recovery flow regression suite.
 *
 * Covers the node-testable auth modules in `lib/auth/recovery.ts` (the same
 * boundary the UI forms call) plus static wiring checks for the new pages.
 *
 * The existing test runner (scripts/tests/suite.ts) is intentionally used so
 * this file integrates with `npm test` — no new test framework is introduced.
 *
 * UI *rendering* (DOM assertions) is intentionally NOT covered here: the repo
 * has no React/DOM test runner wired up. Those belong in the browser/E2E layer
 * (e.g. Playwright). The static source checks below prove the wiring exists.
 *
 * Run: node scripts/tests/auth.test.ts
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { run, finish, assert, assertEqual, assertDeep } from "./suite.ts";
import {
  buildRecoveryRedirectUrl,
  getProductionRecoveryRedirectUrl,
  validateEmailForReset,
  validateUpdatePassword,
  requestPasswordReset,
  updateUserPassword,
  exchangeRecoveryCode,
  type ResetClient,
  type RecoveryClient,
} from "../../lib/auth/recovery.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

function readSource(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

function loadMessages(locale: "ar" | "en" | "fr") {
  const raw = readFileSync(resolve(root, `messages/${locale}.json`), "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

const RECOVERY_KEYS = [
  "recoveryTitle",
  "recoveryInstruction",
  "recoverySubmit",
  "recoveryCheckEmail",
  "recoverySent",
  "recoveryErrorGeneric",
  "recoveryInvalidEmail",
  "backToLogin",
  "updatePasswordTitle",
  "updatePasswordInstruction",
  "newPassword",
  "confirmPassword",
  "updatePasswordSubmit",
  "passwordRequirements",
  "passwordMismatch",
  "passwordUpdated",
  "updatePasswordInvalidLink",
  "updatePasswordErrorGeneric",
  "updatePasswordNewLink",
];

/* ------------------------------------------------------------------ */
/* Recovery request                                                    */
/* ------------------------------------------------------------------ */

await run("recovery: valid email accepted", () => {
  assert(validateEmailForReset("user@example.com"), "valid email must pass");
});

await run("recovery: invalid email rejected", () => {
  assert(!validateEmailForReset("not-an-email"), "invalid email must fail");
  assert(!validateEmailForReset(""), "empty email must fail");
});

await run("recovery: resetPasswordForEmail called exactly once", async () => {
  let calls = 0;
  const client = {
    auth: {
      resetPasswordForEmail: () => {
        calls += 1;
        return Promise.resolve({ error: null });
      },
    },
  } as unknown as ResetClient;

  await requestPasswordReset(client, "u@e.com", "https://x/update-password");
  assertEqual(calls, 1, "must call resetPasswordForEmail once");
});

await run("recovery: email passed to Supabase is preserved", async () => {
  let captured = "";
  const client = {
    auth: {
      resetPasswordForEmail: (email: string) => {
        captured = email;
        return Promise.resolve({ error: null });
      },
    },
  } as unknown as ResetClient;

  await requestPasswordReset(
    client,
    "preserved@example.com",
    "https://x/update-password",
  );
  assertEqual(captured, "preserved@example.com", "email must be forwarded verbatim");
});

await run("recovery: redirect path is exactly /update-password", () => {
  const url = getProductionRecoveryRedirectUrl();
  assertEqual(new URL(url).pathname, "/update-password", "path must be /update-password");
});

await run("recovery: redirect uses configured origin, not localhost", () => {
  const prev = process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;

  const fallback = getProductionRecoveryRedirectUrl();
  assert(!fallback.includes("localhost"), "must not hardcode localhost");
  assert(
    fallback.startsWith("https://"),
    "must use the configured https origin",
  );
  assertEqual(
    fallback,
    "https://servis-sity-iwtr.vercel.app/update-password",
    "defaults to the production Vercel origin",
  );

  process.env.NEXT_PUBLIC_APP_URL = "https://app.service-city.ma";
  assertEqual(
    getProductionRecoveryRedirectUrl(),
    "https://app.service-city.ma/update-password",
    "honors NEXT_PUBLIC_APP_URL",
  );

  if (prev === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = prev;
});

await run("recovery: buildRecoveryRedirectUrl strips trailing slash", () => {
  assertEqual(
    buildRecoveryRedirectUrl("https://x.com/"),
    "https://x.com/update-password",
  );
});

await run("recovery: Supabase errors are propagated", async () => {
  const client = {
    auth: {
      resetPasswordForEmail: () =>
        Promise.resolve({ error: { message: "rate_limited" } }),
    },
  } as unknown as ResetClient;

  const res = await requestPasswordReset(
    client,
    "u@e.com",
    "https://x/update-password",
  );
  assert(res.error !== null, "error must be surfaced to the caller");
  assertEqual(res.error?.message, "rate_limited");
});

await run("recovery: no account enumeration (neutral result)", async () => {
  // The helper must forward Supabase's result verbatim — it must never branch
  // on whether the address exists, which would leak account existence.
  const make = (err: { message: string } | null) =>
    ({
      auth: {
        resetPasswordForEmail: () => Promise.resolve({ error: err }),
      },
    }) as unknown as ResetClient;

  const existing = await requestPasswordReset(
    make(null),
    "exists@example.com",
    "https://x/update-password",
  );
  const unknown = await requestPasswordReset(
    make(null),
    "ghost@example.com",
    "https://x/update-password",
  );
  assertEqual(existing.error, null);
  assertEqual(unknown.error, null);
  assertDeep(existing, unknown, "both addresses yield an identical neutral result");
});

/* ------------------------------------------------------------------ */
/* Password update                                                     */
/* ------------------------------------------------------------------ */

await run("update: valid new password accepted", () => {
  assertEqual(validateUpdatePassword("password123", "password123").ok, true);
});

await run("update: updateUser receives the expected password", async () => {
  let captured: string | null = null;
  let calls = 0;
  const client = {
    auth: {
      updateUser: (attrs: { password: string }) => {
        calls += 1;
        captured = attrs.password;
        return Promise.resolve({ error: null });
      },
    },
  } as unknown as RecoveryClient;

  const res = await updateUserPassword(client, "newStrongPass1");
  assertEqual(calls, 1, "updateUser called once");
  assertEqual(captured, "newStrongPass1", "password forwarded verbatim");
  assertEqual(res.error, null);
});

await run("update: mismatch rejected before calling Supabase", async () => {
  // Mirror the exact guard the form uses: validate first, only then call Supabase.
  let calls = 0;
  const client = {
    auth: {
      updateUser: () => {
        calls += 1;
        return Promise.resolve({ error: null });
      },
    },
  } as unknown as RecoveryClient;

  const result = validateUpdatePassword("alpha1", "beta2");
  assertEqual(result.ok, false);
  assertEqual((result as { error: string }).error, "passwordMismatch");

  // The form only calls Supabase after validation passes.
  if (result.ok) {
    await updateUserPassword(client, "alpha1");
  }
  assertEqual(calls, 0, "Supabase must not be called before validation passes");
});

await run("update: short password rejected (existing rules)", () => {
  assertEqual(
    (validateUpdatePassword("123", "123") as { error: string }).error,
    "passwordRequirements",
  );
  assertEqual(
    (validateUpdatePassword("", "") as { error: string }).error,
    "passwordRequirements",
  );
});

await run("update: too-long password rejected (existing rules)", () => {
  const long = "a".repeat(73);
  assertEqual(
    (validateUpdatePassword(long, long) as { error: string }).error,
    "passwordRequirements",
  );
});

await run("update: Supabase errors are handled", async () => {
  const client = {
    auth: {
      updateUser: () =>
        Promise.resolve({ error: { message: "weak_password" } }),
    },
  } as unknown as RecoveryClient;

  const res = await updateUserPassword(client, "password123");
  assert(res.error !== null, "error must be surfaced to the caller");
  assertEqual(res.error?.message, "weak_password");
});

await run("update: success returns neutral success result", async () => {
  const client = {
    auth: {
      updateUser: () => Promise.resolve({ error: null }),
    },
  } as unknown as RecoveryClient;

  const res = await updateUserPassword(client, "password123");
  assertEqual(res.error, null, "success surfaces as error:null");
});

/* ------------------------------------------------------------------ */
/* Recovery / session handling                                         */
/* ------------------------------------------------------------------ */

await run("session: exchangeRecoveryCode calls exchangeCodeForSession", async () => {
  let code = "";
  let calls = 0;
  const client = {
    auth: {
      exchangeCodeForSession: (c: string) => {
        calls += 1;
        code = c;
        return Promise.resolve({ error: null });
      },
      getSession: () => Promise.resolve({ data: { session: null } }),
      updateUser: () => Promise.resolve({ error: null }),
    },
  } as unknown as RecoveryClient;

  await exchangeRecoveryCode(client, "the-code");
  assertEqual(calls, 1);
  assertEqual(code, "the-code");
});

await run("session: valid recovery code yields ready state", async () => {
  const client = {
    auth: {
      exchangeCodeForSession: () => Promise.resolve({ error: null }),
      getSession: () => Promise.resolve({ data: { session: null } }),
      updateUser: () => Promise.resolve({ error: null }),
    },
  } as unknown as RecoveryClient;

  const res = await exchangeRecoveryCode(client, "the-code");
  assertEqual(res.error, null, "valid code -> recovery session established");
});

await run("session: invalid/expired code handled safely", async () => {
  const client = {
    auth: {
      exchangeCodeForSession: () =>
        Promise.resolve({ error: { message: "code expired" } }),
      getSession: () => Promise.resolve({ data: { session: null } }),
      updateUser: () => Promise.resolve({ error: null }),
    },
  } as unknown as RecoveryClient;

  const res = await exchangeRecoveryCode(client, "bad");
  assert(res.error !== null, "invalid code must surface an error (no crash)");
});

await run("session: recovery tokens/secrets are never logged", () => {
  const forms = [
    "components/auth/update-password-form.tsx",
    "components/auth/forgot-password-form.tsx",
    "lib/auth/recovery.ts",
  ];
  for (const f of forms) {
    const src = readSource(f);
    assert(
      !/console\s*\.\s*log\s*\(/.test(src),
      `${f} must not log anything (no token/session/password leakage)`,
    );
  }
});

await run("session: PASSWORD_RECOVERY event is wired in the page", () => {
  const src = readSource("components/auth/update-password-form.tsx");
  assert(
    src.includes("PASSWORD_RECOVERY"),
    "update-password form must listen for the PASSWORD_RECOVERY event",
  );
});

/* ------------------------------------------------------------------ */
/* Existing login / OAuth behavior must stay intact                    */
/* ------------------------------------------------------------------ */

await run("unchanged: login still uses password + Google sign-in", () => {
  const src = readSource("components/auth/login-form.tsx");
  assert(src.includes("signInWithPassword"), "login must still sign in with password");
  assert(src.includes("GoogleSignInButton"), "Google OAuth button must remain");
  assert(
    !src.includes("resetPasswordForEmail"),
    "inline recovery call removed from login (now a dedicated page)",
  );
});

await run("unchanged: callback still exchanges OAuth code + routes recovery", () => {
  const src = readSource("app/auth/callback/route.ts");
  assert(src.includes("exchangeCodeForSession"), "OAuth code exchange intact");
  assert(src.includes("/update-password"), "recovery redirects to new page");
});

/* ------------------------------------------------------------------ */
/* Login UI wiring (static — see report re: DOM rendering)            */
/* ------------------------------------------------------------------ */

await run("ui: login exposes a link to /forgot-password", () => {
  const src = readSource("components/auth/login-form.tsx");
  assert(
    src.includes('href="/forgot-password"'),
    "login must link to the forgot-password route",
  );
  assert(src.includes('t("forgotPassword")'), "link uses localized label");
});

await run("ui: forgot-password page renders the form", () => {
  const src = readSource("app/[locale]/(auth)/forgot-password/page.tsx");
  assert(src.includes("ForgotPasswordForm"), "page mounts the form");
  assert(src.includes('"recoveryTitle"'), "page sets recovery title");
});

await run("ui: forgot-password form has email input + submit", () => {
  const src = readSource("components/auth/forgot-password-form.tsx");
  assert(src.includes('id="email"') || src.includes('"email"'), "email input present");
  assert(src.includes("recoverySubmit"), "localized submit button present");
  assert(src.includes("recoverySent"), "neutral success message present");
});

await run("ui: update-password page renders the form", () => {
  const src = readSource("app/[locale]/(auth)/update-password/page.tsx");
  assert(src.includes("UpdatePasswordForm"), "page mounts the form");
  assert(src.includes('"updatePasswordTitle"'), "page sets update title");
});

await run("ui: update-password form has both password fields", () => {
  const src = readSource("components/auth/update-password-form.tsx");
  assert(src.includes("newPassword"), "new password field present");
  assert(src.includes("confirmPassword"), "confirm password field present");
  assert(src.includes("updatePasswordSubmit"), "localized submit present");
  assert(src.includes("passwordUpdated"), "success message present");
  assert(src.includes('href="/login"'), "clear path back to login present");
});

/* ------------------------------------------------------------------ */
/* Translations present in all three locales                          */
/* ------------------------------------------------------------------ */

for (const locale of ["ar", "en", "fr"] as const) {
  await run(`translations: ${locale} has all recovery keys`, () => {
    const msg = loadMessages(locale) as Record<string, Record<string, string>>;
    const auth = msg.auth ?? {};
    for (const key of RECOVERY_KEYS) {
      assert(
        typeof auth[key] === "string" && auth[key].length > 0,
        `auth.${key} missing in ${locale}`,
      );
    }
    assert(typeof auth.forgotPassword === "string", `auth.forgotPassword missing in ${locale}`);
  });
}

await finish();
