-- Servis Sity — Phase 1: core schema + RLS
-- Run in the Supabase SQL editor (or via `supabase db push`).

create type user_role as enum ('client', 'owner', 'admin');
create type plan_type as enum ('free', 'premium', 'pro');
create type booking_status as enum ('pending', 'confirmed', 'cancelled');

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'client',
  full_name text,
  phone text,
  city text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  icon text,
  name_ar text not null,
  name_fr text not null,
  name_en text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------
create table businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  category_id uuid not null references categories(id),
  slug text unique not null,
  name text not null,
  description text,
  logo_url text,
  cover_url text,
  phone text,
  whatsapp text,
  address text,
  city text,
  lat float8,
  lng float8,
  plan plan_type not null default 'free',
  verified boolean not null default false,
  rating_avg numeric not null default 0,
  reviews_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index businesses_city_idx on businesses (city);
create index businesses_category_idx on businesses (category_id);
create index businesses_plan_idx on businesses (plan);

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------
create table services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  price numeric,
  duration_minutes integer
);

-- ---------------------------------------------------------------------------
-- business_hours
-- ---------------------------------------------------------------------------
create table business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6), -- 0=Sunday .. 6=Saturday
  open_time time,
  close_time time,
  is_closed boolean not null default false
);

-- ---------------------------------------------------------------------------
-- media
-- ---------------------------------------------------------------------------
create table media (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  type text not null check (type in ('image', 'video')),
  url text not null,
  sort_order integer not null default 0
);

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
create table reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references profiles(id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  reply text,
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

-- Recompute the business rating whenever a review is inserted/updated/deleted
create or replace function public.refresh_business_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target uuid;
begin
  target := coalesce(new.business_id, old.business_id);
  update businesses b
  set rating_avg = coalesce(
        (select avg(rating) from reviews r where r.business_id = b.id), 0),
      reviews_count = (select count(*) from reviews r where r.business_id = b.id)
  where b.id = target;
  return coalesce(new, old);
end;
$$;

create trigger refresh_business_rating_trigger
  after insert or update or delete on reviews
  for each row execute procedure public.refresh_business_rating();

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
create table bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  service_id uuid references services(id),
  client_name text not null,
  client_phone text not null,
  booking_date date not null,
  booking_time time not null,
  status booking_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index bookings_business_status_idx on bookings (business_id, status);

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  plan plan_type not null,
  stripe_subscription_id text,
  status text,
  started_at timestamptz not null default now(),
  expires_at timestamptz
);

-- ---------------------------------------------------------------------------
-- analytics_events
-- ---------------------------------------------------------------------------
create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  event_type text not null check (event_type in ('view', 'whatsapp_click', 'call_click', 'lead', 'photo_view')),
  created_at timestamptz not null default now()
);

create index analytics_events_business_idx on analytics_events (business_id, created_at);

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table profiles enable row level security;
alter table categories enable row level security;
alter table businesses enable row level security;
alter table services enable row level security;
alter table business_hours enable row level security;
alter table media enable row level security;
alter table reviews enable row level security;
alter table bookings enable row level security;
alter table subscriptions enable row level security;
alter table analytics_events enable row level security;

-- Admin helper: an admin can act as the owner of any business
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.is_owner_or_admin(business_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from businesses b
    where b.id = business_id
      and (b.owner_id = auth.uid() or public.is_admin())
  );
$$;

-- profiles: read own + admin; update own + admin
create policy "profiles_select_own" on profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_insert_own" on profiles
  for insert with check (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid() or public.is_admin());

-- categories: public read
create policy "categories_select_public" on categories
  for select using (true);
create policy "categories_admin_all" on categories
  for all using (public.is_admin());

-- businesses: public read; owner/admin write
create policy "businesses_select_public" on businesses
  for select using (true);
create policy "businesses_insert_owner" on businesses
  for insert with check (owner_id = auth.uid() or public.is_admin());
create policy "businesses_update_owner" on businesses
  for update using (public.is_owner_or_admin(id));
create policy "businesses_delete_owner" on businesses
  for delete using (public.is_owner_or_admin(id));

-- services: public read; owner/admin write
create policy "services_select_public" on services
  for select using (true);
create policy "services_owner_all" on services
  for all using (public.is_owner_or_admin(business_id))
  with check (public.is_owner_or_admin(business_id));

-- business_hours: public read; owner/admin write
create policy "business_hours_select_public" on business_hours
  for select using (true);
create policy "business_hours_owner_all" on business_hours
  for all using (public.is_owner_or_admin(business_id))
  with check (public.is_owner_or_admin(business_id));

-- media: public read; owner/admin write
create policy "media_select_public" on media
  for select using (true);
create policy "media_owner_all" on media
  for all using (public.is_owner_or_admin(business_id))
  with check (public.is_owner_or_admin(business_id));

-- reviews: public read; authenticated users insert their own; owner/admin reply
create policy "reviews_select_public" on reviews
  for select using (true);
create policy "reviews_insert_authenticated" on reviews
  for insert with check (auth.uid() = user_id);
create policy "reviews_owner_reply" on reviews
  for update using (public.is_owner_or_admin(business_id))
  with check (public.is_owner_or_admin(business_id));
create policy "reviews_delete_own_or_admin" on reviews
  for delete using (user_id = auth.uid() or public.is_admin());

-- bookings: owner/admin read/update; anyone can create a booking
create policy "bookings_select_owner" on bookings
  for select using (public.is_owner_or_admin(business_id));
create policy "bookings_insert_public" on bookings
  for insert with check (true);
create policy "bookings_update_owner" on bookings
  for update using (public.is_owner_or_admin(business_id))
  with check (public.is_owner_or_admin(business_id));

-- subscriptions: owner/admin read/update
create policy "subscriptions_select_owner" on subscriptions
  for select using (public.is_owner_or_admin(business_id));
create policy "subscriptions_owner_all" on subscriptions
  for all using (public.is_owner_or_admin(business_id))
  with check (public.is_owner_or_admin(business_id));

-- analytics_events: insert from server; owner/admin read
create policy "analytics_insert_public" on analytics_events
  for insert with check (true);
create policy "analytics_select_owner" on analytics_events
  for select using (public.is_owner_or_admin(business_id));

-- ===========================================================================
-- Seed: default categories
-- ===========================================================================
insert into categories (slug, icon, name_ar, name_fr, name_en) values
  ('electricien', 'zap', 'كهربائي', 'Électricien', 'Electrician'),
  ('plombier', 'droplets', 'سباك', 'Plombier', 'Plumber'),
  ('peintre', 'paintbrush', 'صباغ', 'Peintre', 'Painter'),
  ('restaurant', 'utensils', 'مطعم', 'Restaurant', 'Restaurant'),
  ('menuiserie', 'hammer', 'نجار', 'Menuisier', 'Carpenter'),
  ('mecanicien', 'wrench', 'ميكانيكي', 'Mécanicien', 'Mechanic'),
  ('medecin', 'stethoscope', 'طبيب', 'Médecin', 'Doctor'),
  ('coiffeur', 'scissors', 'حلاق', 'Coiffeur', 'Barber'),
  ('professeur', 'graduation-cap', 'أستاذ خصوصي', 'Professeur particulier', 'Private tutor'),
  ('nettoyage', 'sparkles', 'شركة تنظيف', 'Société de nettoyage', 'Cleaning company'),
  ('cafe', 'coffee', 'مقهى', 'Café', 'Cafe'),
  ('photographe', 'camera', 'مصور', 'Photographe', 'Photographer');
