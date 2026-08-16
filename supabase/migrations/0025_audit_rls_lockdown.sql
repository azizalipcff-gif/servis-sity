-- ============================================================================
-- 0025_audit_rls_lockdown.sql
--
-- Production security audit (RLS/RBAC) — two confirmed low-severity gaps:
--
--   1. rate_limits (migration 0004) exposed PUBLIC write/read:
--      policies rate_limits_insert_any / rate_limits_update_any /
--      rate_limits_select_any all use `true`, so any anon/authenticated caller
--      could INSERT/UPDATE/SELECT arbitrary rows via PostgREST. The app never
--      uses this table (lib/security/rate-limit.ts is in-memory), and it was
--      empty at audit time. FIX: drop the permissive policies. RLS stays
--      enabled, so the table is now deny-all for non-service-role clients —
--      no application path reads or writes it.
--
--   2. coupons exposed every coupon code + discount value to PUBLIC:
--      coupons_select_all is `select using (true)`, so anonymous callers could
--      enumerate coupon codes, values, max_usage, per_user_limit and plan
--      restrictions via PostgREST. Coupon validation is server-side only
--      (lib/billing/coupons.ts via the authenticated session client), and
--      nothing client-side reads the coupons table directly. FIX: scope the
--      select policy to authenticated only (admin is a DB role inside
--      authenticated in this schema, so requireAdmin sessions keep working).
--
-- Reversible: re-create the original policies to restore pre-fix state.
-- No DROP TABLE, DELETE, TRUNCATE. General customer policies are untouched.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. rate_limits: remove public-writable policies.
-- ----------------------------------------------------------------------------
drop policy if exists "rate_limits_insert_any" on public.rate_limits;
drop policy if exists "rate_limits_update_any" on public.rate_limits;
drop policy if exists "rate_limits_select_any" on public.rate_limits;

-- ----------------------------------------------------------------------------
-- 2. coupons: select only for authenticated (drop the public select).
-- ----------------------------------------------------------------------------
drop policy if exists "coupons_select_all" on public.coupons;

create policy "coupons_select_authenticated" on public.coupons
  for select to authenticated using (true);
