-- ============================================================================
-- 0023_payments_admin_rls_fix.sql
--
-- BUG: finalizeSuccessfulPayment() runs under the ADMIN session (admin confirm
-- route) but inserts `transactions` and `coupon_usage` rows attributed to the
-- CUSTOMER (user_id). Policies `transactions_insert_own` and `cu_insert_own`
-- only allow `user_id = auth.uid()`, so with an admin session auth.uid() is the
-- admin, not the customer → RLS silently rejects those inserts. Billing history
-- (transactions) and coupon usage were therefore never recorded.
--
-- FIX (Option 1 — narrowly scoped SECURITY DEFINER function):
--   • The general customer policies stay untouched:
--       transactions_insert_own : user_id = auth.uid()
--       cu_insert_own           : user_id = auth.uid()
--     Normal users can still insert only their own rows, exactly as before.
--   • The trusted server-side finalization path now calls a dedicated
--     SECURITY DEFINER function that:
--       1. requires the caller to be an admin (is_admin()),
--       2. loads the payment and requires status = 'succeeded',
--       3. requires the passed user_id/business_id to match the PAYMENT record
--          (ownership is derived from the payment, never from arbitrary input),
--       4. is idempotent per payment (a second call for the same payment is a
--          no-op and returns the existing transaction id).
--
-- Security properties:
--   • No public / authenticated-wide INSERT is opened on transactions or
--     coupon_usage. RLS policies are unchanged.
--   • Non-admin callers (even server-side) are rejected inside the function.
--   • Even an admin cannot attribute a row to an arbitrary customer: the
--     function re-derives ownership from the payment row and rejects mismatches.
--   • Anonymous callers cannot execute the function (revoked from anon/public).
--
-- Reversible: drop the function to return to the pre-fix state. No DROP TABLE,
-- DELETE, or TRUNCATE. The general customer policies were never modified.
-- ============================================================================

create or replace function public.finalize_payment_ledger(
  p_payment_id uuid,
  p_user_id uuid,
  p_business_id uuid,
  p_currency text,
  p_amount_cents bigint,
  p_reference text,
  p_invoice_id uuid default null,
  p_coupon_id uuid default null,
  p_discount_cents bigint default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_tx_id uuid;
begin
  -- 1. Trusted server-side path only.
  if not public.is_admin() then
    raise exception 'finalize_payment_ledger: admin only';
  end if;

  -- 2. Payment must exist and be verified/succeeded.
  select * into v_payment from public.payments where id = p_payment_id;
  if not found then
    raise exception 'finalize_payment_ledger: payment not found';
  end if;
  if v_payment.status <> 'succeeded' then
    raise exception 'finalize_payment_ledger: payment not succeeded';
  end if;

  -- 3. Ownership must come from the payment record. This prevents attributing
  --    a row to any user/business other than the verified payment owner.
  if p_user_id <> v_payment.user_id then
    raise exception 'finalize_payment_ledger: user does not own payment';
  end if;
  if p_business_id is distinct from v_payment.business_id then
    raise exception 'finalize_payment_ledger: business does not match payment';
  end if;

  -- 4. Idempotency: one transaction per payment. Return the existing one.
  select id into v_tx_id from public.transactions
    where payment_id = p_payment_id limit 1;
  if found then
    return v_tx_id;
  end if;

  insert into public.transactions (
    business_id, user_id, payment_id, type, amount_cents, currency, status, reference
  ) values (
    v_payment.business_id, v_payment.user_id, p_payment_id, 'payment',
    p_amount_cents, p_currency, 'completed', p_reference
  ) returning id into v_tx_id;

  if p_coupon_id is not null then
    insert into public.coupon_usage (coupon_id, user_id, invoice_id, total_discount_cents)
    values (p_coupon_id, v_payment.user_id, p_invoice_id, p_discount_cents);
  end if;

  return v_tx_id;
end;
$$;

revoke all on function public.finalize_payment_ledger(uuid, uuid, uuid, text, bigint, text, uuid, uuid, bigint) from public;
grant execute on function public.finalize_payment_ledger(uuid, uuid, uuid, text, bigint, text, uuid, uuid, bigint) to authenticated;
