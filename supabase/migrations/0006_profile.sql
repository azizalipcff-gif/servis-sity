-- Servis Sity — Phase H: complete user profile + notifications.
-- Run after 0005_storage_buckets.sql in the Supabase SQL editor.
--
-- 1) Extends `profiles` with the full public profile schema (URLs only for
--    images — avatar/cover live in Storage, the DB keeps the public URL).
-- 2) Creates the `notifications` center (likes, reviews, bookings, messages,
--    verification, admin actions) scoped to the recipient.

alter table public.profiles
  add column if not exists username text,
  add column if not exists bio text,
  add column if not exists cover_url text,
  add column if not exists website text,
  add column if not exists address text,
  add column if not exists languages text,
  add column if not exists skills text,
  add column if not exists experience text,
  add column if not exists facebook text,
  add column if not exists instagram text,
  add column if not exists tiktok text,
  add column if not exists linkedin text,
  add column if not exists whatsapp text;

-- Unique handle for /profile/{username}.
create unique index if not exists profiles_username_idx
  on public.profiles (username)
  where username is not null;

-- ==========================================================================
-- Notifications
-- ==========================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'general' check (type in ('general','like','review','booking','message','verification','admin')),
  title text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

-- A user can read and update their own notifications only.
create policy "notifications_select_own" on public.notifications
  for select using (recipient_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Server-side inserts come from authenticated service/API clients; the actor
-- (recipient) is always the authenticated row owner, so allow self-insert.
create policy "notifications_insert_own" on public.notifications
  for insert with check (recipient_id = auth.uid());

-- Admin can read/modify notifications (support).
create policy "notifications_admin_all" on public.notifications
  for all using (public.is_admin()) with check (public.is_admin());