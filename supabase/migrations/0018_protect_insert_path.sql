-- Service City — Phase 2 P0: entitlement self-grant on the INSERT path.
--
-- `protect_business_admin_fields` and `protect_profile_role` were UPDATE-only
-- triggers. Because `businesses_insert_owner` / `profiles_insert_own` RLS only
-- check owner/id equality, a non-admin authenticated client could INSERT a
-- business directly through the REST GraphQL surface with plan='premium',
-- verified=true, status='approved' and appear public immediately — the Phase 1
-- update guard never fired. Same class of issue on profiles: a client with no
-- profile row could INSERT one with role='admin'.
--
-- Fix (root cause, DB-level): run both guards BEFORE INSERT OR UPDATE.
--   • businesses INSERT (non-admin): force safe defaults — any client-supplied
--     entitlement values are discarded. Column defaults are already
--     plan='free', status='pending_review', verification_status='none',
--     verified=false, so legitimate app creates (business-form.tsx sends none
--     of these fields) are unaffected.
--   • profiles INSERT (non-admin): force role='client' (default already
--     'client'; the SIGNUP trigger handle_new_user inserts id+full_name only).
--   • UPDATE paths keep the existing, verified behaviour byte for byte.

-- ============================================================================
-- 1. businesses: guard INSERT + UPDATE
-- ============================================================================
create or replace function public.protect_business_admin_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pending_review'::public.business_status;
    new.plan := 'free'::public.plan_type;
    new.verified := false;
    new.verification_status := 'none'::public.verification_status;
    new.verified_at := null;
    new.status_note := null;
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

drop trigger if exists protect_business_admin_fields_trigger on public.businesses;
create trigger protect_business_admin_fields_trigger
  before insert or update on public.businesses
  for each row execute procedure public.protect_business_admin_fields();

-- ============================================================================
-- 2. profiles: guard INSERT + UPDATE (role)
-- ============================================================================
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role := 'client'::public.user_role;
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'only admin can change role';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger
  before insert or update on public.profiles
  for each row execute procedure public.protect_profile_role();