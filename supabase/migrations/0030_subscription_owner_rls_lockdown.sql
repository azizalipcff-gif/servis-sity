-- ============================================================================
-- 0030_subscription_owner_rls_lockdown.sql
--
-- Billing Security Hardening — drop the legacy subscription ALL access.
--
-- Migration 0001 created `subscriptions_owner_all ... FOR ALL` granting every
-- owner INSERT/DELETE/UPDATE on subscriptions for any business they own.
-- PostgreSQL ORs RLS policies per command, so that policy silently bypassed the
-- tighter 0020 `subscriptions_insert_owner` guard and let an owner:
--   • INSERT an arbitrary subscription (e.g. plan='premium', status='active')
--     to self-grant paid entitlements,
--   • DELETE any subscription (including entitlement/audit records).
--
-- This migration:
--   1. DROPs `subscriptions_owner_all` (the root cause).
--   2. Preserves owner SELECT via the existing `subscriptions_select_owner`.
--   3. Preserves the existing owner UPDATE policy, which in practice is field
--      limited by the 0020 `protect_subscription_fields` trigger (plan, price,
--      interval, dates, provider, status-moves outside active<->paused, etc.
--      are admin-only, so owners keep only genuine self-service toggles).
--   4. Keeps the 0020 `subscriptions_insert_owner` policy: a non-admin owner may
--      only create the consumer-safe free/cancelled/paused shape
--      (status IN free/cancelled/paused AND plan='free'); admins/server may
--      create any row.
--   5. Owner DELETE is now DENIED (no qualifying policy). Admin/server-side
--      cleanup is preserved via an explicit admin-only DELETE policy.
--
-- Scope: public.subscriptions only. No data is touched. No unrelated tables.
-- ============================================================================

-- 1. Remove the legacy owner ALL access (INSERT/UPDATE/DELETE/SELECT).
drop policy if exists "subscriptions_owner_all" on public.subscriptions;

-- 2. Preserve server/admin subscription deletion (owner delete stays denied).
drop policy if exists "subscriptions_delete_admin" on public.subscriptions;
create policy "subscriptions_delete_admin" on public.subscriptions
  for delete using (public.is_admin());