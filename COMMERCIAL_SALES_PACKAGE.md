# Servis Sity — Commercial Sales Package

## Recommended offer

**Product:** Servis Sity — White-label Moroccan Local Marketplace Platform

**Recommended asking price:** **40,000 MAD** for a non-exclusive commercial license / source-code transfer package.

The price is a commercial positioning recommendation, not a claim of verified market valuation.

## What the buyer receives

- Complete application source code in this repository.
- Next.js App Router application with TypeScript, responsive UI and RTL-aware localization.
- Moroccan local marketplace architecture for businesses, services and products.
- Public discovery by city, category and search.
- Business storefronts with services, products, gallery, contact and booking flows.
- Customer authentication and account flows.
- Owner / seller dashboard.
- Admin moderation and verification workflows.
- Messaging / conversations.
- Reviews and ratings.
- Favorites.
- Moroccan phone / WhatsApp-oriented contact flows.
- Supabase integration for database, authentication and storage.
- Security foundations including RLS, validation, CSRF/IP protections and rate limiting.
- SEO foundations: metadata, canonical URLs, hreflang, sitemap, robots and structured data.
- Documentation already present in `README.md`, `PROJECT_ARCHITECTURE.md` and `AI_CONTEXT.md`.

## Buyer infrastructure model

The clean commercial handover is buyer-owned infrastructure:

- Buyer-owned GitHub account or transferred repository ownership.
- Buyer-owned Supabase project.
- Buyer-owned Vercel project/account.
- Buyer-owned domain.
- Buyer-owned payment, email, OAuth, maps, analytics and other third-party accounts.

No private development credentials should be transferred.

## Recommended license structure

### Non-exclusive commercial license — recommended default

The buyer receives the rights expressly granted in the signed agreement to deploy, customize, operate and commercially use the software for their business.

Unless the signed agreement says otherwise, the seller retains ownership of the original software and may reuse or license the underlying code for other customers.

### Exclusive sale — premium option

If a buyer requires exclusivity, treat it as a separate negotiated deal with a substantially higher price. Exclusivity should be granted only through a written agreement that clearly defines what is exclusive, for what period, territory and product scope.

## Included support

Recommended: **14 days of post-handover technical support** for setup and defects in the delivered code.

Support does not automatically include new features, custom redesigns, third-party account troubleshooting, paid hosting costs, payment-provider onboarding or ongoing maintenance after the support window.

## Domain and hosted demo

The current Vercel deployment is best treated as a demonstration and reference environment unless the final sale agreement explicitly includes the domain/project.

The buyer should deploy the delivered code to their own Vercel and domain for long-term ownership.

## Third-party materials

Third-party dependencies, fonts, icons, images, templates and external services are not automatically transferred as original intellectual property of the seller. Their own licenses and terms continue to apply.

Before signing an exclusive transfer or promising unrestricted asset ownership, complete an asset/dependency inventory and remove or replace anything that cannot legally be transferred for the intended use.

## What should not be claimed in sales material

Do not market the project as having:

- verified revenue,
- verified paying customers,
- guaranteed traffic or SEO rankings,
- guaranteed payment-provider production approval,
- guaranteed business adoption,
- guaranteed marketplace liquidity,
- or guaranteed production performance beyond what has actually been tested.

A safer commercial description is **"reusable marketplace foundation / launch-ready software package"** with the verification status stated honestly.

## Buyer handover sequence

1. Sign the commercial agreement.
2. Receive payment according to the agreed schedule.
3. Transfer or provide the agreed repository/source package.
4. Buyer creates their own Supabase and Vercel projects.
5. Configure environment variables and third-party services.
6. Apply database migrations and seed/demo data as appropriate.
7. Deploy to buyer-owned domain.
8. Run the documented verification checklist.
9. Start the 14-day support window.

## Suggested payment structure

For a first commercial transaction, a practical structure is:

- **50% deposit** to start the handover.
- **50% before final transfer / production handover.**

For a trusted buyer, the parties can negotiate another structure in writing.

## Suggested buyer-facing positioning

> Servis Sity is a reusable Moroccan local marketplace platform built to connect customers with businesses, service providers and products through city/category/search discovery. The package includes the application source code, marketplace workflows, dashboards, moderation, messaging, reviews, localization, Supabase integration and SEO foundations, with buyer-owned infrastructure for final deployment.

## Seller checklist before closing

- Confirm the exact license type: non-exclusive or exclusive.
- Confirm whether the Vercel demo/domain is included.
- Confirm support duration and what counts as a bug versus a new feature.
- Confirm payment milestones.
- Inventory third-party assets and licenses.
- Remove all private credentials and development secrets.
- Export / document database schema and migrations.
- Prepare final deployment instructions.
- Record the exact commit / release delivered to the buyer.
- Keep a signed copy of the commercial agreement.

## Verification language

Use these labels in technical handover notes:

- `VERIFIED IN CODE`
- `VERIFIED BY TEST`
- `VERIFIED IN DATABASE`
- `VERIFIED LIVE`
- `NOT VERIFIED`
- `CONTRADICTED`

Never upgrade a claim to `VERIFIED LIVE` without an actual live runtime check.
