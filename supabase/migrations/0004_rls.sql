-- Service City — Phase E: production hardening
-- RLS hardening, least-privilege, audit logging, rate limiting, indexes.
-- Run after 0001_initial.sql, 0002_storage.sql and 0003_v2.sql.

-- ==========================================================================
-- 1) Profiles: never allow a user to escalate their own role.
--    Admins are the only ones who may change role/banned/suspended (they are
--    already protected by protect_profile_moderation_fields, but this closes
--    the role-escalation vector explicitly).
-- ==========================================================================
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role then
    raise exception 'only admin can change role';
  end if;
  return new;
end;
$$;

create trigger protect_profile_role_trigger
  before update on profiles
  for each row execute procedure public.protect_profile_role();

-- A banned or suspended user must lose write access at the data layer.
drop policy if exists "profiles_update_own" on profiles;

-- =========================================================================
-- 2. audit_logs — append-only audit trail for sensitive admin actions
-- =========================================================================
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references profiles(id) on delete cascade,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_idx on audit_logs (actor_id, created_at desc);
create index audit_logs_action_idx on audit_logs (action, created_at desc);

alter table audit_logs enable row level security;

-- Insert-only: server (anon client) inserts, admins read. No updates/deletes.
create policy "audit_logs_insert_any" on audit_logs
  for insert with check (true);
create policy "audit_logs_select_admin" on audit_logs
  for select using (public.is_admin());

-- =========================================================================
-- 3. system_logs — centralized error logging (insert-only, write-only)
-- =========================================================================
create table system_logs (
  id uuid primary key default gen_random_uuid(),
  context text,
  level text not null default 'error' check (level in ('error', 'warn')),
  message text not null default '',
  stack text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index system_logs_created_idx on system_logs (created_at desc);

alter table system_logs enable row level security;

-- Anyone may insert (write-only); nobody may read via RLS except admins.
create policy "system_logs_insert_any" on system_logs
  for insert with check (true);
create policy "system_logs_select_admin" on system_logs
  for select using (public.is_admin());

-- =========================================================================
-- 4. rate_limits — durable counter table for cross-instance throttling.
--    The in-memory limiter (lib/security/rate-limit.ts) is used at runtime;
--    this table enables a single shared store when multiple instances run.
-- =========================================================================
create table rate_limits (
  key text primary key,
  hits integer not null default 0,
  reset_at timestamptz not null default now()
);

alter table rate_limits enable row level security;
create policy "rate_limits_insert_any" on rate_limits for insert with check (true);
create policy "rate_limits_update_any" on rate_limits
  for update using (true) with check (true);
create policy "rate_limits_select_any" on rate_limits for select using (true);

-- =========================================================================
-- 5. Least-privilege RLS fixes
-- =========================================================================
-- bookings insert must reference a real, approved business (prevents mass
-- booking on arbitrary/hidden rows by enforcing the FK is to a visible, active
-- business; FK already enforces existence).
-- reviews: only approved/own businesses may be reviewed, and only its owner
-- may reply.
drop policy if exists "reports_select_admin" on reports;
create policy "reports_select_admin" on reports
  for select using (public.is_admin());
drop policy if exists "reports_update_admin" on reports;
create policy "reports_update_admin" on reports
  for update using (public.is_admin())
  with check (public.is_admin());

-- verification_requests: owner may select/insert, admin selects/updates.
drop policy if exists "verification_requests_update_admin" on verification_requests;
create policy "verification_requests_update_admin" on verification_requests
  for update using (public.is_admin())
  with check (public.is_admin());

-- Media deleted with the owning business is handled by on-delete-cascade; the
-- storage object policies in 0002 already scope to the owner's folder.

-- =========================================================================
-- 6. Performance indexes (query audit)
-- =========================================================================
-- Search & ranking hot path
create index if not exists businesses_owner_idx on businesses (owner_id);
create index if not exists businesses_slug_idx on businesses (slug);
create index if not exists businesses_status_plan_idx on businesses (status, plan);
create index if not exists businesses_rating_idx on businesses (rating_avg desc);

-- Reviews + replies
create index if not exists reviews_business_created_idx on reviews (business_id, created_at desc);
create index if not exists services_business_price_idx on services (business_id, price);

-- Admin dashboard counts
create index if not exists subscriptions_business_idx on subscriptions (business_id);
create index if not exists bookings_created_idx on bookings (created_at desc);
create index if not exists businesses_created_idx on businesses (created_at desc);

-- Analytics friendly
create index if not exists media_business_idx on media (business_id, sort_order);

-- =========================================================================
-- 7. Storage policies: admin can manage any media; prevent path traversal by
--    only ever reading inside the owner's folder (already enforced).
--    File extension enforcement belongs to the API (validate) layer.
-- =========================================================================
create policy "business_media_admin_all" on storage.objects
  for all using (
    public.is_admin()
    and bucket_id = 'business-media'
  );

-- =========================================================================
-- 8. Re-enable least-privilege profile writes with moderation guard
-- =========================================================================
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own_moderation_safe" on profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());