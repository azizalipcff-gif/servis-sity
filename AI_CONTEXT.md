# Service City — AI Context

## Purpose

This file is the compact operating context for AI coding agents working on Service City. It is intentionally practical: architecture, source-of-truth rules, important security boundaries, domain conventions and verification requirements.

## Repository

- GitHub repository: `azizalipcff-gif/servis-sity`
- Default branch inspected: `main`
- Package name: `service-city`
- Framework: Next.js App Router
- TypeScript: strict

## Core Stack

- Next.js 15.5.22
- React 19
- TypeScript 5
- Supabase JS + Supabase SSR
- next-intl
- TanStack React Query
- Tailwind CSS 4
- Zod
- React Hook Form
- Framer Motion
- Lucide
- Radix/shadcn UI
- Upstash Redis/rate limiting

## Application Shape

Primary route areas:

- `app/[locale]` — localized pages
- `app/api` — backend HTTP endpoints
- `app/auth` — authentication routes
- `components` — reusable UI
- `lib` — domain/server/client utilities
- `supabase/migrations` — database schema and RLS evolution
- `scripts/tests` — focused automated tests
- `messages` — localization content

`next-intl` is integrated through `i18n/request.ts`, `i18n/routing` and the locale route segment.

## Authentication / Authorization

Supabase Auth is used with SSR cookies.

`middleware.ts` performs a preliminary user lookup and guest redirects. It recognizes the hidden admin route segment `mvkbazizalimvkbadmen`.

Do NOT treat middleware as the final authorization layer. Admin layouts and every admin API route must enforce admin authorization server-side.

## Security Rules

- Preserve Supabase RLS.
- Never weaken a policy merely to unblock application code.
- Never expose a service-role key to browser/client code.
- Server-side trusted operations should use narrowly scoped authorization and validation.
- `SECURITY DEFINER` functions must have an explicit safe `search_path` and internal authorization checks.
- Validate ownership from trusted database records for privileged operations.
- Keep privileged mutation paths idempotent.
- Validate external URLs/keys before constructing clients.
- Preserve CSRF, rate-limit, IP and auth protections already present in the project.

## Billing / Payment Rules

Billing is security-sensitive.

Migration `0023_payments_admin_rls_fix.sql` adds `finalize_payment_ledger(...)` for the admin finalization path. It requires `is_admin()`, requires a succeeded payment, checks supplied ownership against the payment, derives inserted ownership from the payment, and is idempotent per payment.

Migration `0024_payments_refund_rls_fix.sql` adds `finalize_payment_refund(...)` and `coupon_global_usage(...)`. Refund persistence is admin-only, ownership comes from the payment, and refund persistence is idempotent. The migration comments specify that an external gateway refund should happen in application code before the persistence RPC.

Migration `0025_audit_rls_lockdown.sql` removes permissive public policies from `rate_limits` and restricts coupon reads to authenticated users.

Never claim a payment/refund is production-complete based only on the existence of these migrations. Verify the route, provider call, database state and runtime behavior.

## Data / Database Rules

Supabase migrations are the schema source of truth. Before writing SQL or application queries:

1. Find the relevant migration/table definition.
2. Confirm column names and constraints.
3. Inspect RLS policies and helper functions.
4. Trace the calling server/client path.
5. Check existing tests.

Do not invent columns or assume old schema details remain valid.

## Image Rules

For any image bug, trace the complete pipeline:

`DB/storage object → URL mapping → component props → Next Image/native image → remote config → dimensions → error/fallback state`.

Do not fix a broken image only by hiding the error. Determine whether the URL, storage object, database field, remote host configuration or UI component is the root cause.

## Internationalization Rules

The application is locale-aware. Preserve `[locale]` routing, `next-intl` middleware behavior, translated messages and RTL-sensitive UI when editing pages or components.

Do not hard-code English-only navigation or user-facing strings when the surrounding feature is localized.

## API / Server Rules

For API changes:

- authenticate when required;
- authorize the resource owner/admin explicitly;
- validate input with existing schemas/patterns;
- preserve consistent error responses;
- avoid leaking internal errors/secrets;
- consider CSRF/rate limits where the route is state-changing;
- use server-side Supabase clients for privileged operations;
- keep database and external-service side effects ordered and idempotent.

## Testing

The root `test` command runs a broad set of focused tests covering search, billing, security, validation, URL handling, WhatsApp, city logic, analytics, CSRF/IP controls, owner flows, moderation, storage, messenger, authentication, reviews, sitemap and SEO.

Available E2E scripts include moderation and owner deletion.

When changing a domain, run its focused tests first and the broader suite when practical.

Important: a test listed in `package.json` is not evidence that it passes. Only an executed result is evidence of a passing test.

## Verification Language

Use these labels internally and in reports:

- `VERIFIED IN CODE` — source inspected.
- `VERIFIED BY TEST` — test actually executed and passed.
- `VERIFIED IN DATABASE` — live DB inspected.
- `VERIFIED LIVE` — production runtime checked.
- `NOT VERIFIED` — no sufficient evidence.
- `CONTRADICTED` — repository/runtime evidence conflicts with the claim.

Never turn a code-level claim into a live-production claim without checking the live system.

## Working Method for AI Agents

### Before editing

1. Read this file.
2. Read `PROJECT_ARCHITECTURE.md`.
3. Inspect the relevant route/component/lib/migration.
4. Trace callers and data flow.
5. Identify tests.
6. Check for existing patterns before creating new abstractions.

### While editing

- Make the smallest correct change.
- Preserve established architecture.
- Fix related root-cause issues when clearly part of the same flow.
- Do not silently rewrite unrelated areas.
- Do not remove security checks to make a test pass.
- Keep types strict.

### After editing

1. Run the most relevant focused tests.
2. Run lint/build when the change warrants it.
3. Re-read changed code for authorization, null handling and race/idempotency issues.
4. Verify the user-facing flow if browser tooling is available.
5. Report exactly what was verified and what was not.

## Known Project Context

The repository contains a mature set of marketplace, moderation, messenger, analytics, owner and billing tests and migrations. Billing also has documented future/incomplete areas such as renewal automation, CMI/Payzone merchant integration, upgrade/downgrade proration, trials, payment-method UX/API, refund history UI, invoice delivery/detail pages and advanced revenue/tax analytics. These are not to be assumed complete without current code evidence.

## Do Not Trust Blindly

Historical prompts, generated README files, copied audit reports and previous AI claims are not authoritative when they conflict with repository code. Re-check the current source.

The current GitHub README was observed to be minimal/default-style content, so this document and `PROJECT_ARCHITECTURE.md` should be treated as the maintained architecture/context references rather than relying on an older external README narrative.

## Secret Handling

Never place real values for Supabase service keys, payment secrets, webhook secrets, OAuth secrets or other credentials in documentation, commits or AI responses. Document variable names and expected purpose only.

## Definition of Done

A feature is done only when:

- implementation is correct;
- authorization/security is preserved;
- database constraints/RLS are respected;
- relevant tests pass;
- build/lint is healthy when applicable;
- the actual flow is verified where practical;
- no unsupported production claims are made.
