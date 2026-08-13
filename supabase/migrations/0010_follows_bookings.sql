-- Service City — Phase J: follows + booking lifecycle.
-- Run after 0009_cities_seed.sql.
--
--  • follows:  user -> business or user -> user relationships (follow system)
--  • bookings: extend status to a full ownership lifecycle
--  • notifications: add a `category` column (bookings/reviews/messages/payments…)

-- ==========================================================================
-- Follows (users follow businesses and/or other users)
-- ==========================================================================
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_type text not null check (following_type in ('business', 'user')),
  business_id uuid references public.businesses(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint follows_target_check check (
    (following_type = 'business' and business_id is not null and user_id is null)
    or (following_type = 'user' and user_id is not null and business_id is null)
  )
);

create unique index if not exists follows_business_unique
  on public.follows (follower_id, following_type, business_id)
  where following_type = 'business';

create unique index if not exists follows_user_unique
  on public.follows (follower_id, user_id)
  where following_type = 'user';

alter table public.follows enable row level security;

create policy "follows_select_public" on public.follows for select using (true);
create policy "follows_insert_own" on public.follows
  for insert with check (follower_id = auth.uid());
create policy "follows_delete_own" on public.follows
  for delete using (follower_id = auth.uid());

-- Helper counts (used by analytics/UI without exposing full tables)
create or replace function public.count_followers(bid uuid)
returns bigint language sql stable security definer set search_path = public
as $$ select count(*) from public.follows where business_id = bid $$;

-- ==========================================================================
-- Bookings: full owner lifecycle
-- ==========================================================================
do $$
begin
  alter type public.booking_status add value if not exists 'accepted';
  alter type public.booking_status add value if not exists 'rejected';
  alter type public.booking_status add value if not exists 'completed';
end $$;

alter table public.bookings
  add column if not exists notes text,
  add column if not exists customer_id uuid references public.profiles(id);

-- ==========================================================================
-- Notifications: category + actor (for realtime + grouping)
-- ==========================================================================
alter table public.notifications
  add column if not exists category text not null default 'general';

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id, read_at);