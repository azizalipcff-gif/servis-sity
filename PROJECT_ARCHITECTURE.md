# Service City — Project Architecture

> Source-of-truth architecture document for the `azizalipcff-gif/servis-sity` repository.
> Updated from direct repository inspection. Claims that require production/database runtime evidence are explicitly marked as such.

## 1. Project Identity

Service City / Servis Sity is a Next.js marketplace application for Moroccan local businesses, services and products. The repository is a private Next.js application named `service-city` and uses the App Router, TypeScript, Supabase, `next-intl`, React Query, Tailwind CSS, Zod, React Hook Form, Framer Motion and Lucide.

## 2. Stack Verified in Repository

- Next.js: `15.5.22`
- React: `19.2.x`
- TypeScript: `5.x`, strict mode enabled
- Supabase: `@supabase/ssr` + `@supabase/supabase-js`
- Internationalization: `next-intl`
- Data/query layer: TanStack React Query
- Validation/forms: Zod + React Hook Form
- Styling: Tailwind CSS v4
- UI/animation: Radix/shadcn ecosystem, Framer Motion, Lucide
- Security/rate limiting dependencies: Upstash Redis + rate-limit
- Deployment target: Vercel-oriented Next.js project

`package.json` confirms dedicated test scripts covering search, billing, billing security, authentication, authorization-related flows, moderation, storage, messenger, owner deletion, CSRF, analytics, SEO and other areas.

## 3. Repository Structure

### Application

- `app/[locale]/` — locale-aware application routes
- `app/api/` — API routes
- `app/auth/` — authentication-related routes
- `app/globals.css` — global styles
- `app/manifest.ts` — web app manifest
- `app/robots.ts` — robots metadata
- `app/sitemap.ts` — sitemap generation
- `app/global-error.tsx` — global error boundary

### Shared/application code

- `components/` — reusable and feature UI components
- `lib/` — server/client utilities, domain logic, Supabase, billing, payments and security
- `scripts/tests/` — repository test suite
- `supabase/migrations/` — database evolution
- `messages/` — localization resources
- `.opencode/skills/` — OpenCode-specific project skills/instructions

## 4. Routing Architecture

The repository uses a locale-prefixed App Router architecture. The root `app` directory currently contains `[locale]`, `api`, and `auth` as major route areas.

The middleware uses `next-intl` routing and recognizes locale-prefixed routes. It also contains special handling for a hidden admin path segment and authenticated favorites.

### Special admin route

The middleware defines the admin segment as:

`mvkbazizalimvkbadmen`

The middleware performs an initial authentication gate for this area. The comment in the implementation explicitly states that the authoritative admin-role check must remain server-side in the admin layout and every admin API route.

### Favorites

`profile/favorites` is treated as an authenticated page. Guests are redirected to the locale login page with a return target.

## 5. Middleware / Request Security

`middleware.ts` combines:

1. `next-intl` locale routing.
2. Supabase SSR authentication lookup.
3. An edge-level guest gate for the hidden admin area.
4. A guest gate for profile favorites.
5. Validation of Supabase URL/key before constructing the server client.

The middleware matcher excludes API routes, auth routes, Next internals, Vercel internals and static-file-like paths.

Important: middleware authentication is not the final authorization boundary. Admin APIs must independently enforce admin authorization.

## 6. TypeScript Configuration

TypeScript is configured with `strict: true`, `noEmit: true`, bundler module resolution, isolated modules and the `@/*` path alias mapped to the repository root.

## 7. Security Headers / Content Security Policy

`next.config.ts` configures security headers including:

- Content-Security-Policy
- X-Content-Type-Options
- X-Frame-Options
- Referrer-Policy
- Permissions-Policy
- Strict-Transport-Security
- X-DNS-Prefetch-Control
- Cross-Origin-Opener-Policy
- Cross-Origin-Resource-Policy

Images are configured for HTTPS Supabase domains, Unsplash and Placehold. Development CSP permits `unsafe-eval` for Turbopack/HMR; the production branch omits it.

## 8. Supabase Architecture

Supabase is a core backend dependency. The repository uses both SSR-compatible Supabase clients and direct Supabase JS access where appropriate.

Security-sensitive operations use database RLS and, for trusted server-side workflows, narrowly scoped `SECURITY DEFINER` functions.

The repository contains migrations for the initial schema, RLS, profile/marketplace features, follows/bookings, messenger, payments and later security hardening.

## 9. Billing / Payments Architecture

The repository contains dedicated billing/payment domains:

- `lib/payments/*`
- `lib/billing/*`
- `app/api/billing/*`
- `app/api/admin/payments/*`
- `app/api/admin/plans/*`
- `app/api/admin/coupons/*`
- `app/api/webhooks/*`

### Payment ledger RLS fix — migration 0023

`0023_payments_admin_rls_fix.sql` defines `public.finalize_payment_ledger(...)` as a `SECURITY DEFINER` function with `search_path = public`.

The function:

- requires `public.is_admin()`;
- requires the payment to exist;
- requires payment status `succeeded`;
- verifies supplied user/business ownership against the payment row;
- derives inserted ownership from the payment record;
- is idempotent by payment;
- inserts the transaction and optional coupon usage.

PUBLIC execution is revoked and execution is granted to authenticated users; authorization is enforced inside the function.

**Repository status: VERIFIED IN CODE. Production execution status: NOT independently verified by this repository-only audit.**

### Refund RLS fix — migration 0024

`0024_payments_refund_rls_fix.sql` defines `public.finalize_payment_refund(...)` as a `SECURITY DEFINER` function.

It:

- requires `is_admin()`;
- loads the payment;
- is idempotent by payment;
- inserts a succeeded refund;
- inserts a completed refund transaction;
- marks the payment refunded;
- derives ownership from the payment row.

It also defines `coupon_global_usage(uuid)` as a read-only `SECURITY DEFINER` aggregate counter.

**Repository status: VERIFIED IN CODE. Actual production execution and gateway behavior: NOT independently verified here.**

### Important payment rule

Database persistence and external gateway execution are separate concerns. The repository comments state that gateway refund execution happens in application code before the refund persistence RPC.

This must be verified against the actual route/provider implementation before claiming end-to-end refund success.

## 10. Security Audit Findings Visible in Migrations

Migration `0025_audit_rls_lockdown.sql` documents and fixes two identified RLS exposure classes:

1. `rate_limits` had permissive public read/write policies; those policies are dropped, leaving the table deny-by-default for non-service-role clients.
2. `coupons` had a public select policy exposing coupon data; it is replaced by an authenticated-only select policy.

**Status: VERIFIED IN CODE.**

## 11. Testing Architecture

The root `test` script runs a broad sequence of focused Node-based tests, including:

- search quality
- billing
- billing security
- validation
- URLs
- WhatsApp
- city logic
- analytics
- CSRF/IP controls
- workspace state
- owner flows
- moderation
- storage upload guards
- messenger
- owner deletion
- authentication
- admin billing
- reviews
- sitemap
- SEO

The repository also defines dedicated E2E scripts for moderation and owner deletion.

**Important:** presence of a test script proves the test exists in the repository; it does not prove the test currently passes. Runtime execution must be performed separately.

## 12. Image Architecture

`next.config.ts` enables optimized AVIF/WebP output and permits remote HTTPS images from Supabase and selected external hosts.

The image system should be understood as:

`database/storage URL → server/client data mapping → image component → layout dimensions → fallback/error handling`

A full component-level image audit requires tracing all image components and their callers. This document therefore does not claim that every image flow is verified.

## 13. Internationalization

The project uses `next-intl` middleware and a locale-aware `[locale]` route tree. Locale routing is initialized from `./i18n/routing` and message/request configuration is wired through `next-intl/plugin`.

## 14. Current Billing Scope / Known Incomplete Areas

The repository's billing map identifies the following as incomplete or blocked areas and these should remain clearly separated from implemented Phase 1 functionality until independently verified:

- renewal scheduler/engine
- CMI / Payzone merchant integration
- upgrade/downgrade/proration
- trial activation flow
- saved payment methods UX/API
- user-facing refund listing/history UI
- invoice PDF/email delivery/detail page
- admin MRR/ARR/revenue analytics
- country-specific tax calculation

These items are documented as project context; actual implementation status should be checked against current code before development.

## 15. Verification Rules

A future AI must distinguish:

- **VERIFIED IN CODE** — directly observed in repository source.
- **VERIFIED IN DATABASE** — confirmed against the actual database.
- **VERIFIED LIVE** — confirmed against production runtime.
- **VERIFIED BY TEST** — the relevant test was actually executed successfully.
- **NOT VERIFIED** — evidence is missing.
- **OUTDATED / CONTRADICTED** — repository evidence conflicts with the claim.

Never upgrade a claim from code verification to production verification without direct evidence.

## 16. Development Safety Rules

1. Understand before editing.
2. Treat repository code and database schema as the source of truth.
3. Never guess routes, tables, columns or authorization rules.
4. Trace the full data flow before modifying critical logic.
5. Preserve existing behavior unless the task explicitly changes it.
6. Fix root causes rather than masking symptoms.
7. Keep security boundaries explicit.
8. Never weaken RLS to make an application path work.
9. Never expose service-role capabilities to clients.
10. Keep external payment execution and database persistence consistent and idempotent.
11. Verify related flows after significant changes.
12. Never claim production success without production evidence.

## 17. Audit Limitations

This document is based on direct repository inspection available through the connected GitHub repository. GitHub repository contents alone cannot prove the current live Supabase database state, Vercel runtime state, secrets, external payment credentials, or successful production probes.

Those claims must be verified through the corresponding runtime/production systems before being labeled `VERIFIED LIVE`.
