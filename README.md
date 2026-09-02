# Servis Sity

## White-label Moroccan Local Marketplace Platform

Servis Sity is a reusable marketplace foundation for launching a branded local-services and businesses platform in Morocco.

### Core capabilities

- Local business profiles and storefronts
- Services and products marketplace
- City/category/search discovery
- Customer accounts and authentication
- Owner/seller dashboard
- Admin moderation and verification workflows
- Messaging and conversations
- Reviews and ratings
- Favorites
- Localization with locale-aware routing
- Moroccan-focused contact and WhatsApp flows
- Supabase database, authentication and storage integration
- Security controls including RLS, CSRF protections, validation and rate limiting
- Billing/payment infrastructure foundations
- SEO, sitemap, robots and structured application metadata
- Responsive UI with RTL-aware localization support

### Technology

- Next.js 15.5.22 / App Router
- React 19
- TypeScript (strict)
- Supabase
- next-intl
- TanStack Query
- Tailwind CSS 4
- Zod / React Hook Form
- Framer Motion
- Radix / shadcn UI
- Lucide
- Upstash Redis / rate limiting
- Vercel-oriented deployment

## Local development

Requirements: Node.js 20+ and a Supabase project.

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from the environment variable names used by the application. Never commit real credentials.

3. Start development:

```bash
npm run dev
```

4. Open the local application at `http://localhost:3000`.

## Verification

The repository includes focused automated tests for search, billing/security, validation, URLs, WhatsApp, city logic, analytics, CSRF/IP controls, owner flows, moderation, storage upload guards, messenger, authentication, reviews, sitemap and SEO, plus selected E2E flows.

Run:

```bash
npm test
npm run lint
npm run build
```

A test script existing in the repository is not itself proof that the test passes; use executed results as the verification source of truth.

## Deployment model

The intended commercial deployment model is buyer-owned infrastructure:

- Buyer-owned Supabase project
- Buyer-owned Vercel project/account
- Buyer-owned domain
- Buyer-provided production credentials and third-party service accounts

Do not transfer or reuse private credentials from the development environment.

## Commercial licensing

The repository is distributed as proprietary software unless a separate written agreement states otherwise. Commercial customers receive only the rights expressly granted in their signed license/agreement.

Third-party dependencies and assets remain subject to their respective licenses and terms. Before a commercial transfer, perform an asset/dependency inventory and confirm the applicable rights for fonts, images, icons, templates, snippets and external services.

## Commercial sale package

The buyer-facing commercial package and recommended terms are documented in:

- `COMMERCIAL_SALES_PACKAGE.md` — offer, scope, licensing options, pricing recommendation, support and handover terms.
- `BUYER_HANDOVER_CHECKLIST.md` — operational checklist for source, Supabase, Vercel, SEO and functional handover.
- `SALES_OUTREACH_MESSAGE.md` — ready-to-send buyer introduction.

## Verification language

Project reports distinguish between:

- `VERIFIED IN CODE`
- `VERIFIED BY TEST`
- `VERIFIED IN DATABASE`
- `VERIFIED LIVE`
- `NOT VERIFIED`
- `CONTRADICTED`

Production claims should only use `VERIFIED LIVE` when the live runtime has actually been checked.

## Project documentation

- `AI_CONTEXT.md` — operating/security rules for coding agents
- `PROJECT_ARCHITECTURE.md` — architecture and current verification boundaries
- `LICENSE` — repository licensing notice

## Important commercial limitation

This repository is a reusable marketplace foundation. It should not be marketed as having verified revenue, verified active customers, or complete production payment operations unless those claims are independently demonstrated.
