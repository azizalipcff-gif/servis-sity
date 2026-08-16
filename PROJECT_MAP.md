# PROJECT MAP — SERVICE CITY

## Phase 1 — SaaS Billing & Subscription

### Active work
- **SERVICE CITY — SaaS PHASE 1 / BILLING & SUBSCRIPTION** (finalization RLS fix + billing hardening)

### Source of truth
- Product task: conversation backlog — see Blocker Registry and Phase 1 deliverables below.
- Code: `lib/payments/*`, `lib/billing/*`, `app/api/billing/*`, `app/api/admin/payments|plans|coupons/*`, `app/api/webhooks/*`, `supabase/migrations/0023*`, `0024*`.

---

## BLOCKER REGISTRY

| # | Blocker | Status | Owner | Opened | Closed |
|---|---------|--------|-------|--------|--------|
| B1 | Admin-session payment finalization inserts `transactions`/`coupon_usage` for the customer, but RLS policies (`transactions_insert_own`, `cu_insert_own`) require `user_id = auth.uid()` → finalize silently dropped billing history + coupon usage | **VERIFIED LIVE** (migration 0023 EXECUTED on production, live probes pass) | backend | phase1 | phase1 |
| B2 | Admin refund path inserts `refunds`/`transactions` under the admin session (same RLS class as B1) and never executed the gateway refund | **VERIFIED LIVE** (migration 0024 EXECUTED on production, live probes pass) | backend | phase1 | phase1 |

### B1 — PAYMENT FINALIZATION RLS
- **Root cause:** `finalizeSuccessfulPayment()` runs under the admin session (`app/api/admin/payments/route.ts` → `requireAdmin` → session client). It inserts customer-attributed `transactions` and `coupon_usage` rows. Policies in `0012_payments.sql`:
  - `transactions_insert_own : user_id = auth.uid()`
  - `cu_insert_own : user_id = auth.uid()`
  With `auth.uid()` = admin ≠ customer, RLS silently rejected those writes. Transaction history and coupon usage were never recorded; failure was silent because the old code ignored `.error`.
- **Fix (option 1 — SECURITY DEFINER function):** RPC `public.finalize_payment_ledger(...)` requires `is_admin()`, requires payment `status='succeeded'`, derives ownership from the payment record, idempotent per payment. Revoked from PUBLIC, granted to authenticated (gated by `is_admin()` inside). General customer policies untouched.
- **Service changes** (`lib/payments/service.ts`): idempotency keyed on existing transaction (not `payment.status`); throws with contextual prefixes on every write; invoice issued before the ledger RPC; `paid_at` set at insert.
- **Migration:** `supabase/migrations/0023_payments_admin_rls_fix.sql` — **EXECUTED** on production (verified live: function present + admin-gated).

### B2 — PAYMENT REFUND RLS + GATEWAY EXECUTION
- **Root cause:** `admin/payments` PATCH refund inserted `refunds` + relied on direct writes under the admin session, and never called `provider.refund()`.
- **Fix:** migration `0024_payments_refund_rls_fix.sql` adds SECURITY DEFINER `finalize_payment_refund(p_payment_id, p_provider_refund_id, p_reason)` (idempotent per payment, derives ownership from payment, writes refund + refund transaction, marks payment refunded) and `coupon_global_usage(p_coupon_id)` (global coupon count under RLS). Admin route now executes the gateway refund first (Stripe resolves session→intent; PayPal resolves order→capture), then persists via the RPC. Manual/cmi/payzone refunds return a local ref (no-op).
- **Migration:** `supabase/migrations/0024_payments_refund_rls_fix.sql` — **EXECUTED** on production (verified live: function present + admin-gated).
- **Note (pre-execution review fix):** 0024 originally inserted `refunds.status = 'completed'`, which violates the `refunds_status_check` CHECK (`pending|succeeded|failed|cancelled`) → insert would fail. Fixed to `'succeeded'` before executing. Verified compatible against the live CHECK constraint.

---

## Migrations status

| Migration | File | Status |
|-----------|------|--------|
| 0001 initial schema | `supabase/migrations/0001_initial.sql` | applied |
| 0003 v2 | `supabase/migrations/0003_v2.sql` | applied |
| 0004 rls | `supabase/migrations/0004_rls.sql` | applied |
| 0006 profile | `supabase/migrations/0006_profile.sql` | applied |
| 0007 marketplace | `supabase/migrations/0007_marketplace.sql` | applied |
| 0010 follows/bookings | `supabase/migrations/0010_follows_bookings.sql` | applied |
| 0011 messenger | `supabase/migrations/0011_messenger.sql` | applied |
| 0012 payments | `supabase/migrations/0012_payments.sql` | applied |
| 0020 rls hardening | `supabase/migrations/0020_rls_security_hardening.sql` | applied |
| 0023 payments admin RLS fix | `supabase/migrations/0023_payments_admin_rls_fix.sql` | **EXECUTED** on production (live-verified) |
| 0024 payments refund RLS fix | `supabase/migrations/0024_payments_refund_rls_fix.sql` | **EXECUTED** on production (live-verified) |
| 0025 audit RLS lockdown | `supabase/migrations/0025_audit_rls_lockdown.sql` | **EXECUTED** on production (live-verified) |

---

## Phase 1 deliverables (SaaS Billing & Subscription)

| Item | Status |
|------|--------|
| Finalize RLS fix (B1) — SECURITY DEFINER ledger RPC | DONE — EXECUTED on production, live-verified |
| Refund RLS fix + real gateway refund (B2) | DONE — EXECUTED on production, live-verified |
| subscription_history CHECK violation on cancel/pause/resume | DONE |
| Verify route wired: client poll after gateway return + payment status UI | DONE |
| Admin confirm idempotency keyed on transaction (not payment.status) | DONE |
| Webhook route `app/api/webhooks/[provider]` (stripe/paypal) | DONE |
| Payment env-var documentation (`.env.example`) | DONE |
| Checkout duplicate-purchase guard (`findActiveSubscriptionId`) | DONE |
| Featured purchase dedupe (stable idempotency key + pending-slot check) | DONE |
| Global coupon usage counting via `coupon_global_usage` RPC | DONE — EXECUTED on production, live-verified |
| `planTypeFor`/`isPaidPlan` include `pro` (businesses.plan enum) | DONE |
| Admin plans POST/PATCH/DELETE error surfacing | DONE |
| Broken `/billing` links → `/dashboard/billing` | DONE |
| Billing pure-logic unit tests (`scripts/tests/billing.test.ts`) | DONE |

---

## ORPHANS & PENDING

- **Renewal engine** — `next_billing_at`/`auto_renew` written but never acted on; `provider.renew()` no-ops; needs a scheduler (pg_cron / queue) + renewal payment creation. BLOCKED on infra decision; not implemented.
- **CMI / Payzone providers** — `createCheckout` returns bare gateway URL without signed form payload; `verifyPayment` hard-coded `pending`. Requires merchant console integration; stubbed by design. BLOCKED on merchant credentials/contracts.
- **Upgrade / downgrade / proration** — no mid-cycle plan-change API. DB supports `upgraded`/`downgraded` history actions; not implemented.
- **Trial flow** — `trial_days`/`trial_end_at`/`trialing` state exist but no trial activation path.
- **Payment methods UI/API** — `payment_methods` table unused; no saved-card UX.
- **Refunds listing API + refund transaction history UI** — refunds exist in DB; no list endpoint surfaced to users.
- **Invoice PDF / email delivery / invoice detail page** — `pdf_url` never set; no delivery.
- **Admin revenue analytics** — no MRR/ARR/revenue endpoints (admin/analytics page only shows page-view events).
- **Per-country tax** — `salesTaxRate` hard-coded 20% for all currencies.
