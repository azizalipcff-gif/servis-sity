-- Service City — V2: status workflow, cities, verification, favorites, reports
-- Run after 0001_initial.sql and 0002_storage.sql in the Supabase SQL editor.

-- =========================================================
-- New enums
-- =========================================================
create type business_status as enum ('pending_review', 'approved', 'rejected', 'suspended');
create type verification_status as enum ('none', 'pending', 'verified', 'rejected');

-- =========================================================
-- cities
-- =========================================================
create table cities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_ar text not null,
  name_fr text not null,
  name_en text not null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- profiles: moderation columns
-- =========================================================
alter table profiles add column banned boolean not null default false;
alter table profiles add column suspended boolean not null default false;

-- =========================================================
-- businesses: status + verification + city + completeness
-- =========================================================
alter table businesses add column city_id uuid references cities(id);
alter table businesses add column status business_status not null default 'pending_review';
alter table businesses add column status_note text;
alter table businesses add column verification_status verification_status not null default 'none';
alter table businesses add column verified_at timestamptz;
alter table businesses add column profile_completeness integer not null default 0;
alter table businesses add column last_updated_at timestamptz not null default now();

create index businesses_status_idx on businesses (status);
create index businesses_city_id_idx on businesses (city_id);

-- =========================================================
-- services: description + photo
-- =========================================================
alter table services add column description text;
alter table services add column photo_url text;

-- =========================================================
-- favorites
-- =========================================================
create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, business_id)
);

-- =========================================================
-- reports
-- =========================================================
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id),
  business_id uuid not null references businesses(id) on delete cascade,
  reason text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved')),
  created_at timestamptz not null default now()
);

-- =========================================================
-- verification_requests
-- =========================================================
create table verification_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  id_document_url text,
  activity_document_url text,
  status verification_status not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- RLS: enable on new tables
-- =========================================================
alter table cities enable row level security;
alter table favorites enable row level security;
alter table reports enable row level security;
alter table verification_requests enable row level security;

-- cities: public read, admin write
create policy "cities_select_public" on cities for select using (true);
create policy "cities_admin_all" on cities for all using (public.is_admin());

-- favorites: owner manages own favorites
create policy "favorites_select_own" on favorites for select using (user_id = auth.uid());
create policy "favorites_insert_own" on favorites for insert with check (user_id = auth.uid());
create policy "favorites_delete_own" on favorites for delete using (user_id = auth.uid());

-- reports: any logged-in user can report; only admin reviews
create policy "reports_insert_authenticated" on reports
  for insert with check (auth.uid() = reporter_id);
create policy "reports_select_admin" on reports
  for select using (public.is_admin());
create policy "reports_update_admin" on reports
  for update using (public.is_admin());

-- verification_requests: owner of the business manages; admin reviews
create policy "verification_requests_insert_owner" on verification_requests
  for insert with check (
    exists (
      select 1 from businesses b
      where b.id = business_id and (b.owner_id = auth.uid() or public.is_admin())
    )
  );
create policy "verification_requests_select_owner" on verification_requests
  for select using (
    exists (
      select 1 from businesses b
      where b.id = business_id and (b.owner_id = auth.uid() or public.is_admin())
    )
  );
create policy "verification_requests_update_admin" on verification_requests
  for update using (public.is_admin());

-- =========================================================
-- Businesses RLS: status-aware + admin-only delete
-- =========================================================
drop policy "businesses_select_public" on businesses;
create policy "businesses_select_public" on businesses
  for select using (
    status = 'approved'
    or owner_id = auth.uid()
    or public.is_admin()
  );

drop policy "businesses_delete_owner" on businesses;
create policy "businesses_delete_admin" on businesses
  for delete using (public.is_admin());

-- Protect admin-only fields on businesses
-- (status, status_note, verification_status, verified_at)
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
     or new.verified_at is distinct from old.verified_at then
    raise exception 'only admin can change status/verification fields';
  end if;
  return new;
end;
$$;

create trigger protect_business_admin_fields_trigger
  before update on businesses
  for each row execute procedure public.protect_business_admin_fields();

-- Protect banned/suspended on profiles (admin-only)
create or replace function public.protect_profile_moderation_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.banned is distinct from old.banned
     or new.suspended is distinct from old.suspended then
    raise exception 'only admin can change moderation fields';
  end if;
  return new;
end;
$$;

create trigger protect_profile_moderation_fields_trigger
  before update on profiles
  for each row execute procedure public.protect_profile_moderation_fields();

-- Auto-compute profile_completeness (0-100) + touch last_updated_at
create or replace function public.touch_business()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.last_updated_at := now();
  new.profile_completeness :=
    (case when new.description is not null and length(new.description) > 0 then 25 else 0 end)
    + (case when new.logo_url is not null and new.logo_url <> '' then 20 else 0 end)
    + (case when new.cover_url is not null and new.cover_url <> '' then 15 else 0 end)
    + (case when new.phone is not null and new.phone <> '' then 15 else 0 end)
    + (case when new.address is not null and new.address <> '' then 10 else 0 end)
    + (case when new.city_id is not null then 15 else 0 end);
  return new;
end;
$$;

create trigger touch_business_trigger
  before update on businesses
  for each row execute procedure public.touch_business();

-- =========================================================
-- Seed: cities
-- =========================================================
insert into cities (slug, name_ar, name_fr, name_en) values
  ('casablanca', 'الدار البيضاء', 'Casablanca', 'Casablanca'),
  ('rabat', 'الرباط', 'Rabat', 'Rabat'),
  ('marrakech', 'مراكش', 'Marrakech', 'Marrakech'),
  ('fes', 'فاس', 'Fès', 'Fes'),
  ('tanger', 'طنجة', 'Tanger', 'Tangier'),
  ('agadir', 'أكادير', 'Agadir', 'Agadir'),
  ('meknes', 'مكناس', 'Meknès', 'Meknes'),
  ('oujda', 'وجدة', 'Oujda', 'Oujda'),
  ('kenitra', 'القنيطرة', 'Kénitra', 'Kenitra'),
  ('tetouan', 'تطوان', 'Tétouan', 'Tetouan'),
  ('sale', 'سلا', 'Salé', 'Salé'),
  ('mohammedia', 'المحمدية', 'Mohammedia', 'Mohammedia'),
  ('el-jadida', 'الجديدة', 'El Jadida', 'El Jadida'),
  ('nador', 'الناظور', 'Nador', 'Nador'),
  ('beni-mellal', 'بني ملال', 'Béni Mellal', 'Beni Mellal'),
  ('laayoune', 'العيون', 'Laâyoune', 'Laayoune'),
  ('dakhla', 'الداخلة', 'Dakhla', 'Dakhla'),
  ('essaouira', 'الصويرة', 'Essaouira', 'Essaouira'),
  ('taza', 'تازة', 'Taza', 'Taza'),
  ('safi', 'آسفي', 'Safi', 'Safi');
