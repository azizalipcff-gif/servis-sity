-- ============================================================================
-- 0029_payments_snapshot_protection.sql
--
-- Billing Security Hardening — server-controlled payment snapshots.
--
-- 1. Payments INSERT is now ADMIN-ONLY. Payment rows are authored by the
--    server (checkout/featured routes create them with the service-role client,
--    which bypasses RLS at the query layer). This closes the path where a user
--    session could insert an arbitrary payment row — own provider reference,
--    own plan/metadata, own amount — and present it to an admin to confirm.
--
-- 2. protect_payment_snapshot() freezes the authoritative snapshot columns on
--    UPDATE for authenticated non-admin sessions: amount_cents, currency,
--    provider, provider_payment_id, gateway_ref, idempotency_key, user_id,
--    business_id, subscription_id, payment_method, metadata. The user-mirrorable
--    `status` column stays writable BY DESIGN (checkout/verify/webhook mirror
--    gateway-reported state); entitlements are still granted only by the admin
--    confirm action. Service-role writes (auth.uid() IS NULL) are trusted and
--    exempt — a null uid can never pass the RLS SELECT/USING checks that gate
--    anon/authenticated access, so no non-admin session reaches this trigger.
--
-- 3. subscription_history INSERT tightening: a non-admin business owner may
--    record only their own cancel/pause/resume events. Admin (finalization,
--    refund) writes create/renewed/upgraded/... rows. This stops an owner from
--    forging a billing timeline (e.g. a fake 'create -> premium' event) for
--    dashboards and reporting.
--
-- Reversible: drop the policies/trigger/function to restore pre-fix state.
-- No DROP TABLE, DELETE or TRUNCATE. General customer policies are unchanged.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Payments INSERT — admin-only (rows are server-authored via service role).
-- ----------------------------------------------------------------------------
drop policy if exists "payments_insert_owner" on public.payments;
create policy "payments_insert_admin" on public.payments
  for insert with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. Payment snapshot immutability on UPDATE (authenticated non-admin only).
-- ----------------------------------------------------------------------------
create or replace function public.protect_payment_snapshot()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Trusted server-side writes (service role, auth.uid() IS NULL) proceed;
  -- admins proceed. Any other authenticated session may not touch the snapshot.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.amount_cents is distinct from old.amount_cents
     or new.currency is distinct from old.currency
     or new.provider is distinct from old.provider
     or new.provider_payment_id is distinct from old.provider_payment_id
     or new.gateway_ref is distinct from old.gateway_ref
     or new.idempotency_key is distinct from old.idempotency_key
     or new.user_id is distinct from old.user_id
     or new.business_id is distinct from old.business_id
     or new.subscription_id is distinct from old.subscription_id
     or new.payment_method is distinct from old.payment_method
     or new.metadata is distinct from old.metadata then
    raise exception 'payment snapshot fields are admin-only';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_payment_snapshot_trigger on public.payments;
create trigger protect_payment_snapshot_trigger
  before update on public.payments
  for each row execute procedure public.protect_payment_snapshot();

-- ----------------------------------------------------------------------------
-- 3. Subscription history — owner writes limited to lifecycle self-actions.
-- ----------------------------------------------------------------------------
drop policy if exists "subhistory_insert_owner" on public.subscription_history;
create policy "subhistory_insert_owner" on public.subscription_history
  for insert with check (
    public.is_admin()
    or (
      public.is_owner_or_admin(business_id)
      and action in ('cancelled', 'paused', 'resumed')
    )
  );