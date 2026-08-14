-- Service City — P1 fix: Business owners must not self-escalate entitlements.
-- Run after 0015_seed_momia_shop.sql.
--
-- The `businesses_update_owner` RLS policy lets an owner UPDATE their own row
-- (column-level restrictions are not expressible in RLS). The existing
-- `protect_business_admin_fields` trigger only guarded the moderation columns
-- (status/status_note/verification_status/verified_at), so an owner could set
-- `plan = 'premium'`/`enterprise/...` or `verified = true` directly through
-- the browser anon client. Extend the guard to plan + verified, which are only
-- written by admin-session flows today (admin payments confirm, admin PATCH).
--
-- Deliberately NOT guarded here: rating_avg/reviews_count — they are recomputed
-- by the security-definer `refresh_business_rating` trigger, which performs the
-- business UPDATE under the invoking (non-admin) session; adding them to this
-- guard would break review submissions.

create or replace function public.protect_business_admin_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.status_note is distinct from old.status_note
     or new.verification_status is distinct from old.verification_status
     or new.verified_at is distinct from old.verified_at
     or new.plan is distinct from old.plan
     or new.verified is distinct from old.verified then
    raise exception 'only admin can change status/verification/entitlement fields';
  end if;
  return new;
end;
$$;

-- ==========================================================================
-- P1: Featured purchases were paid but never activated.
-- `featured_businesses` only had an admin-ALL policy, so the seller-side
-- insert of a `pending` slot silently failed while the manual payment was
-- recorded — money collected, feature never delivered (admin confirm then had
-- nothing to flip to `active`). Allow the business owner to request a pending
-- slot; activation stays admin-only.
-- ==========================================================================
create policy "featb_insert_owner_pending" on public.featured_businesses
  for insert with check (
    status = 'pending'
    and (select public.is_owner_or_admin(business_id))
  );