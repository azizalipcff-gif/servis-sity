# Servis Sity Audit Report

**Scope:** repository/code inspection plus Supabase database checks performed on 2026-09-02.

## Status definitions

- **VERIFIED** — directly tested or checked against the live database/environment.
- **INCOMPLETE** — implementation exists but a required check, edge case, or fix remains.
- **NOT VERIFIED** — visible in code/UI but no successful end-to-end verification was recorded.

| Area | Status | Route/File | Severity | Finding / recommended fix |
|---|---|---|---|---|
| Demo business/service category relationships | VERIFIED | Supabase data | High | Published services on approved businesses were checked for category mismatch; none remain. Keep seed data validation. |
| Demo product/business category relationships | VERIFIED | Supabase data | High | Published products on approved businesses were checked for category mismatch; none remain. |
| Homepage counters | INCOMPLETE | app/[locale]/(public)/page.tsx | High | Queries were corrected to use published inventory and populated cities; live browser verification remains. |
| Businesses CTA links | VERIFIED IN CODE | home components | High | Broken /business links were corrected to /businesses; production route test remains. |
| City filtering | INCOMPLETE | lib/queries.ts | High | Normalized city_id filtering was added with legacy fallback; browser query test remains. |
| English marketing claims | INCOMPLETE | messages/en.json | High | Major unverified claims were softened; complete copy sweep across all locales/pages remains. |
| Products | INCOMPLETE | public marketplace | High | Data relationships were cleaned; full product page and search journey remains. |
| Images and assets | INCOMPLETE | cards/storage | High | Fallbacks exist in code paths but every live URL and license source has not been verified. |
| Authentication | INCOMPLETE | middleware/auth routes | Critical | Code and tests exist; live customer/owner/admin journey still required. |
| Owner authorization | INCOMPLETE | dashboard/server actions/RLS | Critical | Must be tested against a second owner account and direct URLs. |
| Admin authorization | INCOMPLETE | admin layout/API/RLS | Critical | Middleware is only an edge gate; authoritative server-side checks must be verified live. |
| Supabase RLS | INCOMPLETE | database policies | Critical | Security advisor reported multiple callable SECURITY DEFINER functions; audit each before changing permissions. |
| Messaging | NOT VERIFIED | messenger | High | Requires authenticated end-to-end test. |
| Billing/payment | NOT VERIFIED | billing routes | Critical | Do not market as functional payments until checkout/webhook lifecycle is tested. |
| RTL | INCOMPLETE | /ar and shared components | High | Full viewport matrix not recorded. |
| Mobile UX | NOT VERIFIED | public/dashboard/admin | High | 360/390/768/1024/1440 browser matrix pending. |
| SEO | INCOMPLETE | metadata/sitemap/robots | Medium | Metadata exists; live crawl and route verification pending. |
| Build | INCOMPLETE | Vercel | Critical | New commits are deploying; final successful production build must be recorded. |

## Security findings requiring deliberate review

The Supabase security advisor currently flags RLS enabled with no policy on rate_limits, extensions in the public schema, and multiple SECURITY DEFINER functions executable by anon.

Do not blindly revoke all function execution: each function must be inspected for caller checks, search_path safety, grants, and actual use before changing production permissions.

## Current demo-data baseline checked

- 12 businesses exist across approved, pending-review and rejected moderation states.
- Published services attached to approved businesses passed the category consistency check.
- Published products attached to approved businesses passed the category consistency check.
- Public statistics are being changed to distinguish sample/demo inventory and populated marketplace cities.

## Next audit gates

1. Wait for the latest production deployment to finish.
2. Run production build result review.
3. Run browser QA on /en, Arabic RTL, search, business, service and product routes.
4. Run authenticated customer, owner and admin authorization journeys.
5. Inspect RLS policies and every externally callable SECURITY DEFINER function.
6. Complete asset-by-asset and dependency lockfile license inventory.
7. Update VERIFIED_FEATURE_MATRIX.md only with executed evidence.
