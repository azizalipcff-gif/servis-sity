# Servis Sity — Commercial Readiness Checklist

## Purpose

This document is the pre-sale checklist for packaging Servis Sity as a white-label/local-marketplace software asset.

## 1. Code and repository

- [x] Proprietary license notice added
- [x] Default Next.js README replaced with project documentation
- [x] `.env*` files ignored by Git
- [x] Service-role and secret-key patterns not found by the initial repository search
- [ ] Full Git history secret scan completed
- [ ] Full dependency license inventory completed
- [ ] Full asset/font/image/icon/template license inventory completed
- [ ] Final production build executed successfully
- [ ] Full automated test suite executed successfully
- [ ] E2E flows executed successfully

## 2. Buyer handover

The commercial package should be deployed into infrastructure owned by the buyer:

- Supabase project
- Vercel project
- Domain
- Production third-party service accounts
- Production environment variables

The seller should never hand over personal credentials or retain hidden production dependencies.

## 3. Product verification

Before sales claims are made, verify and classify each major feature:

| Area | Status | Evidence required |
|---|---|---|
| Public marketplace | NOT VERIFIED | Live browser flow |
| Business profiles | NOT VERIFIED | Live browser flow |
| Services | NOT VERIFIED | Live browser flow + DB |
| Products | NOT VERIFIED | Live browser flow + DB |
| Search/filtering | NOT VERIFIED | Executed tests + browser |
| Authentication | NOT VERIFIED | Executed tests + browser |
| Owner dashboard | NOT VERIFIED | Browser flow |
| Admin moderation | NOT VERIFIED | Browser flow |
| Messaging | NOT VERIFIED | Browser flow |
| Reviews | NOT VERIFIED | Browser flow |
| Favorites | NOT VERIFIED | Browser flow |
| Localization/RTL | NOT VERIFIED | Browser flow |
| Storage/images | NOT VERIFIED | Browser flow + storage |
| Billing | NOT VERIFIED | Route/provider/DB verification |
| SEO/sitemap | NOT VERIFIED | Executed tests + live probe |
| Security controls | VERIFIED IN CODE where documented | Executed tests + runtime checks |

Do not upgrade a row to `VERIFIED LIVE` without direct live evidence.

## 4. Demo package

Recommended demo dataset:

- 12 clearly labeled demo businesses
- 30 demo services
- 15 demo products
- 15 demo reviews
- 4 demo owner accounts
- 1 demo customer account
- 1 demo admin account
- 3 sample conversations
- 1–2 Moroccan cities
- At least one pending/rejected moderation example
- Free and Pro plan examples if billing UI is shown

**Current status:** the connected Supabase demo environment now contains the verified dataset counts for 12 businesses, 30 services, 15 products, 15 reviews, 3 sample conversations, business hours for all 12 demo businesses, multiple Moroccan cities, plan examples, featured businesses, and pending/rejected moderation examples. See `DEMO_DATA.md`.

All demo names, images and reviews must be owned, generated, licensed, or clearly labeled as demo material.

## 5. Sales positioning

Use:

> White-label Local Marketplace Platform — Next.js + Supabase

Position the sale around saved development time, reusable architecture, customization and deployment — not around unverified traction or revenue.

Do not claim:

- verified revenue;
- verified active commercial customers;
- exclusive ownership of every third-party dependency or asset;
- complete payment-provider production readiness;
- production readiness without current runtime evidence.

## 6. Recommended commercial structure

Default offer:

- Launch Package: 40,000 DH
- White-label Plus: 60,000 DH
- Customization: scoped separately from approximately 75,000 DH depending on requirements

Suggested payment structure: 50% deposit before deployment/customization and 50% on agreed delivery/acceptance.

Exclusive rights should be negotiated separately and should not be granted at ordinary license pricing.

## 7. License scope

Recommended default license:

- Non-exclusive commercial license
- One project / one brand
- Buyer may modify the licensed source for that project
- Deployment on buyer-owned infrastructure
- No resale or sublicensing of the core source as a competing software product
- No automatic transfer of exclusive IP ownership
- Support limited to the agreed support period
- Future features/updates excluded unless separately contracted

Final legal terms must be reviewed and agreed in the actual contract.

## 8. Pre-sale gate

Do not send the complete repository as a sales preview.

Use this sequence:

1. Public/private demo
2. Feature matrix
3. Technical overview
4. Limited technical due diligence after serious interest/NDA
5. Signed license/scope
6. Deposit
7. Buyer infrastructure setup
8. Deployment/customization
9. Acceptance
10. Final payment and handover
