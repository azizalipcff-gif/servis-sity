-- Servis Sity — Phase I: full marketplace taxonomies, products, services.
-- Run after 0006_profile.sql in the Supabase SQL editor.
--
--  • categories: parent/child + SEO (Arabic/French/English) + broad Morocco set
--  • cities:      region + geo + population for every major Moroccan city
--  • businesses:  contact/social/location/SEO/service-area + subcategory links
--  • products:    full commerce table (draft/publish/archive, stock, discounts)
--  • services:    status + ordering

-- ==========================================================================
-- 1. Categories -> support parent/child + SEO
-- ==========================================================================
alter table public.categories
  add column if not exists parent_id uuid references public.categories(id),
  add column if not exists seo_title text,
  add column if not exists seo_description text;

create index if not exists categories_parent_idx on public.categories (parent_id);

-- ==========================================================================
-- 2. Cities -> region + geo + population + (English/Arabic/French already set)
-- ==========================================================================
alter table public.cities
  add column if not exists region text,
  add column if not exists lat float8 default 0,
  add column if not exists lng float8 default 0,
  add column if not exists population integer default 0;

-- ==========================================================================
-- 3. Businesses -> professional contact/social/geo/SEO fields
-- ==========================================================================
alter table public.businesses
  add column if not exists subcategory_id uuid references public.categories(id),
  add column if not exists email text,
  add column if not exists website text,
  add column if not exists facebook text,
  add column if not exists instagram text,
  add column if not exists tiktok text,
  add column if not exists linkedin text,
  add column if not exists languages text,
  add column if not exists tags text,
  add column if not exists keywords text,
  add column if not exists service_area text,
  add column if not exists google_maps_url text,
  add column if not exists ean text;

-- ==========================================================================
-- 4. Products — full marketplace catalog
-- ==========================================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid references public.categories(id),
  slug text not null unique,
  name text not null,
  description text,
  price numeric not null default 0,
  compare_at_price numeric,
  currency text not null default 'MAD',
  stock integer not null default 0,
  images text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  featured boolean not null default false,
  sku text,
  tags text[] not null default '{}',
  views integer not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_business_idx on public.products (business_id);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_status_idx on public.products (business_id, status);

-- ==========================================================================
-- 5. Services -> production readiness (status + ordering + updated_at)
-- ==========================================================================
alter table public.services
  add column if not exists status text not null default 'published'
    check (status in ('draft', 'published', 'archived')),
  add column if not exists gallery text[] not null default '{}',
  add column if not exists featured boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

-- ==========================================================================
-- RLS
-- ==========================================================================
alter table public.products enable row level security;
alter table public.cities enable row level security;

-- products: public read of published + featured; owner/admin write.
create policy "products_select_public" on public.products
  for select using (status = 'published' or public.is_owner_or_admin(business_id));
create policy "products_insert_owner" on public.products
  for insert with check (public.is_owner_or_admin(business_id));
create policy "products_update_owner" on public.products
  for update using (public.is_owner_or_admin(business_id));
create policy "products_delete_owner" on public.products
  for delete using (public.is_owner_or_admin(business_id));

-- services: status-aware public read (published only), owner/admin write.
create policy "services_select_published" on public.services
  for select using (status = 'published' or public.is_owner_or_admin(business_id));