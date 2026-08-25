-- 0044 User management: force-logout + audit action

-- Audit action for forced session revocation
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'user.force_logout';

-- Server-side session revocation for a target user.
-- The installed Supabase Auth SDK only supports revoking the caller's own
-- sessions, so admin-driven logout is implemented here as a SECURITY DEFINER
-- function that deletes the target user's auth sessions / refresh tokens.
-- Access is restricted to admins and self-revocation is blocked, so an admin
-- can never lock themselves out of the panel.
create or replace function public.admin_revoke_user_sessions(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'self_revoke_forbidden' using errcode = '42501';
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'auth' and table_name = 'sessions'
  ) then
    delete from auth.sessions where user_id = p_user_id;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'auth' and table_name = 'refresh_tokens'
  ) then
    delete from auth.refresh_tokens where user_id = p_user_id;
  end if;
end;
$$;

revoke execute on function public.admin_revoke_user_sessions(uuid) from public;
grant execute on function public.admin_revoke_user_sessions(uuid) to authenticated;
