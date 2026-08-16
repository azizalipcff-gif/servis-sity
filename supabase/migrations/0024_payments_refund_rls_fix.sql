-- ============================================================================
-- 0024_payments_refund_rls_fix.sql
--
-- BUG: The admin refund action (app/api/admin/payments/route.ts PATCH refund)
-- ran under the ADMIN session and inserted a `refunds` row plus (previously)
-- relied on direct writes. It never recorded a `transactions` row for the
-- refund, and the gateway refund was never actually executed.
--
-- FIX: Add a narrowly scoped SECURITY DEFINER function `finalize_payment_refund`
-- (mirrors 0023's `finalize_payment_ledger` design):
--   • requires the caller to be an admin (is_admin()),
--   • loads the payment and requires it exists,
--   • is idempotent per payment (a second refund call is a no-op),
--   • inserts the `transactions` row (type = 'refund', status = 'completed')
--     with ownership derived from the PAYMENT record (never caller input),
--   • inserts the `refunds` row, also derived from the payment,
--   • marks the payment 'refunded'.
--
-- The actual gateway call (provider.refund) happens in app code first; this
-- function only persists the ledger state, so a DB write can never fire a
-- duplicate gateway refund.
--
-- Reversible: drop the function to return to the pre-fix state. No DROP TABLE,
-- DELETE, or TRUNCATE. General customer policies are untouched.
-- ============================================================================

create or replace function public.finalize_payment_refund(
  p_payment_id uuid,
  p_provider_refund_id text default null,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_refund_id uuid;
begin
  -- 1. Trusted server-side path only.
  if not public.is_admin() then
    raise exception 'finalize_payment_refund: admin only';
  end if;

  -- 2. Payment must exist.
  select * into v_payment from public.payments where id = p_payment_id;
  if not found then
    raise exception 'finalize_payment_refund: payment not found';
  end if;

  -- 3. Idempotency: one refund per payment. Return the existing one.
  select id into v_refund_id from public.refunds
    where payment_id = p_payment_id limit 1;
  if found then
    return v_refund_id;
  end if;

  insert into public.refunds (
    payment_id, user_id, amount_cents, currency, reason, provider_refund_id, status
  ) values (
    v_payment.id, v_payment.user_id, v_payment.amount_cents, v_payment.currency,
    p_reason, p_provider_refund_id, 'succeeded'
  ) returning id into v_refund_id;

  insert into public.transactions (
    business_id, user_id, payment_id, refund_id, type, amount_cents, currency,
    status, reference
  ) values (
    v_payment.business_id, v_payment.user_id, v_payment.id, v_refund_id, 'refund',
    v_payment.amount_cents, v_payment.currency, 'completed', 'REF-' || substr(v_refund_id::text, 1, 8)
  );

  update public.payments
    set status = 'refunded'
    where id = v_payment.id
    and status <> 'refunded';

  return v_refund_id;
end;
$$;

revoke all on function public.finalize_payment_refund(uuid, text, text) from public;
grant execute on function public.finalize_payment_refund(uuid, text, text) to authenticated;

-- ============================================================================
-- Global coupon usage count.
--
-- BUG: applyCoupon() counted coupon_usage under the USER session, where RLS
-- (cu_select_own) limits the count to the caller's own rows — so max_usage was
-- effectively per-user, never global.
--
-- FIX: a SECURITY DEFINER counter that reads the real total across all users.
-- It is read-only and exposes only an aggregate number, so it leaks nothing
-- except "how many times this coupon was used" to any authenticated caller.
-- ============================================================================

create or replace function public.coupon_global_usage(p_coupon_id uuid)
returns bigint
language sql stable security definer set search_path = public
as $$
  select count(*) from public.coupon_usage where coupon_id = p_coupon_id;
$$;

revoke all on function public.coupon_global_usage(uuid) from public;
grant execute on function public.coupon_global_usage(uuid) to authenticated;
