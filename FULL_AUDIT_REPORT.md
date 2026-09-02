# Servis Sity Audit Report

Audit date: 2026-09-02

## VERIFIED
- Repository is a Next.js 15 App Router application with TypeScript and next-intl.
- Supabase public schema contains marketplace, auth/profile, messaging, moderation, billing-foundation and analytics tables with RLS enabled.
- Current database snapshot contains 12 businesses, 30 services, 15 products, 33 cities and 40 categories.
- Current query layer restricts public businesses to approved status and business-detail services to published status.
- Marketplace type selection was added to global search.
- Homepage unsupported payment/support claims were removed.
- A production Vercel deployment previously completed successfully for the recent main branch; the newest audit commits still require deployment verification.

## INCOMPLETE
- Full route-by-route browser audit.
- Search/filter URL and mobile matrix verification.
- Product flow end-to-end verification.
- Business profile empty/error-state verification.
- Owner and admin live role authorization verification.
- Moderation journey verification.
- Storage upload verification.
- Full RTL review at 360, 390, 768, 1024 and 1440 widths.
- Accessibility keyboard/focus audit.
- Dependency lockfile license scan.
- Per-file image/asset provenance inventory.
- Billing integration verification.

## NOT VERIFIED
- Real payment processing.
- Email notification delivery.
- Automated renewals.
- Booking end-to-end workflow.
- Real marketplace traction, revenue or active-user claims.
- Mobile app.
- Live end-to-end messaging in production.

## Security findings
Supabase security advisor reported an RLS-enabled rate_limits table with no policy, three extensions installed in public, and multiple SECURITY DEFINER functions executable by anon. Internal payment/trigger-oriented functions were revoked from anon during this audit. Other functions were not changed blindly because they may be required by RLS or public search behavior.

## Demo-data rule
Database records are not treated as proof of real customers, verified reviews, revenue or marketplace traction. Demo/sample content must be labeled where it could otherwise mislead a buyer or end user.
