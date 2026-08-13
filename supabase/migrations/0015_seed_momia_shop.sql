-- Service City — Momia Shop seed
-- Idempotent: safe to re-run in the Supabase SQL editor (or via `supabase db push`).
--
-- NOTE ON THE REAL SCHEMA (adapted from the app migrations):
--   • `profiles.id` references `auth.users(id)`, so the owner needs a real
--     auth user (a trigger then auto-creates the profile row).
--   • `businesses` uses status/verification_status/plan; "featured" is driven
--     by plan='premium'. No `is_featured` column.
--   • `services`/`products` have no localized-name columns — they are added
--     below (nullable, app-compatible).

-- ============================================================================
-- Prérequis: extension pgcrypto (crypt / gen_salt pour le mot de passe de démo)
-- ============================================================================
create extension if not exists pgcrypto;

-- ============================================================================
-- ÉTAPE 1: Catégories (Cafe, Maintenance, Equipment, Repair)
-- ============================================================================
-- Cafe est rangé sous "Restaurants", les autres sous "Services professionnels".
insert into public.categories (id, slug, icon, name_ar, name_fr, name_en, parent_id, seo_title, seo_description)
select
  gen_random_uuid(), 'cafe', 'coffee',
  'كافيه', 'Café', 'Cafe',
  (select id from public.categories where slug = 'restaurants'),
  'Cafés au Maroc', 'Cafés et coffee shops au Maroc sur Service City.'
where not exists (select 1 from public.categories where slug = 'cafe');

insert into public.categories (id, slug, icon, name_ar, name_fr, name_en, parent_id, seo_title, seo_description)
select
  gen_random_uuid(), 'maintenance', 'wrench',
  'صيانة', 'Maintenance', 'Maintenance',
  (select id from public.categories where slug = 'services-pro'),
  'Maintenance au Maroc', 'Maintenance et entretien professionnels au Maroc sur Service City.'
where not exists (select 1 from public.categories where slug = 'maintenance');

insert into public.categories (id, slug, icon, name_ar, name_fr, name_en, parent_id, seo_title, seo_description)
select
  gen_random_uuid(), 'equipment', 'cpu',
  'معدات', 'Équipement', 'Equipment',
  (select id from public.categories where slug = 'services-pro'),
  'Équipements au Maroc', 'Équipements professionnels au Maroc sur Service City.'
where not exists (select 1 from public.categories where slug = 'equipment');

insert into public.categories (id, slug, icon, name_ar, name_fr, name_en, parent_id, seo_title, seo_description)
select
  gen_random_uuid(), 'repair', 'hammer',
  'إصلاح', 'Réparation', 'Repair',
  (select id from public.categories where slug = 'services-pro'),
  'Réparation au Maroc', 'Services de réparation au Maroc sur Service City.'
where not exists (select 1 from public.categories where slug = 'repair');

-- ============================================================================
-- Ville de Berkane (absente du seed des villes — requise par le filtrage city)
-- ============================================================================
insert into public.cities (id, slug, name_ar, name_fr, name_en, region, lat, lng, population)
select
  gen_random_uuid(), 'berkane', 'بركان', 'Berkane', 'Berkane',
  'Oriental', 34.9219, -2.3160, 109237
where not exists (select 1 from public.cities where slug = 'berkane');

-- ============================================================================
-- ÉTAPE 2: Profile propriétaire (via auth.users → trigger auto-crée le profile)
-- ============================================================================
-- Mot de passe de démo: Momia2024! (à changer avant mise en production)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'owner@momishop.ma',
  crypt('Momia2024!', gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', array['email']),
  jsonb_build_object('full_name', 'Momia Shop Owner'),
  now(), now()
on conflict (id) do nothing;

-- Le trigger handle_new_user a créé le profile; on le complète (idempotent).
update public.profiles
set role = 'owner',
    full_name = 'Momia Shop Owner',
    phone = '+212 6XX-XXXXXX',
    city = 'berkane'
where id = '00000000-0000-4000-8000-000000000001';

-- ============================================================================
-- ÉTAPE 3: Business momia shop
-- ============================================================================
-- status='approved' + verified=true sont requis pour apparaître publiquement.
-- plan='premium' le place dans la section mise en avant (featured).
insert into public.businesses (
  owner_id, category_id, slug, name, description,
  logo_url, cover_url, phone, whatsapp, email, address, city,
  lat, lng, plan, verified, verified_at, rating_avg, reviews_count,
  status, verification_status, city_id, website, languages, tags,
  service_area, last_updated_at
)
select
  '00000000-0000-4000-8000-000000000001',
  (select id from public.categories where slug = 'cafe'),
  'momia-shop', 'momia shop',
  'Professional cafe maintenance and coffee machine sales',
  'https://placehold.co/400x400/2c3e50/ffffff?text=Momia',
  'https://placehold.co/1600x900/2c3e50/f39c12?text=momia+shop',
  '+212 6XX-XXXXXX', '+212 6XX-XXXXXX', 'owner@momishop.ma',
  'Berkane, Maroc', 'berkane',
  34.9219, -2.3160,
  'premium', true, now(), 5, 1,
  'approved', 'verified',
  (select id from public.cities where slug = 'berkane'),
  NULL, 'fr, en', 'cafe, coffee machine, maintenance',
  'Berkane', now()
where not exists (select 1 from public.businesses where slug = 'momia-shop');

-- ============================================================================
-- ÉTAPE 4: Services (colonnes localisées ajoutées — compatibles avec l'app)
-- ============================================================================
alter table public.services add column if not exists name_ar text;
alter table public.services add column if not exists name_fr text;
alter table public.services add column if not exists description_ar text;
alter table public.services add column if not exists description_fr text;
alter table public.services add column if not exists price_unit text not null default 'MAD';
alter table public.services add column if not exists price_type text;
alter table public.services add column if not exists category text;
alter table public.services add column if not exists subcategory text;
alter table public.services add column if not exists tags text[] not null default '{}';

insert into public.services (
  business_id, name, name_ar, name_fr, description, description_ar, description_fr,
  price, price_unit, price_type, duration_minutes, category, subcategory,
  status, featured, gallery, tags
)
select
  (select id from public.businesses where slug = 'momia-shop'),
  'Cafe machine maintenance', 'صيانة آلات القهوة', 'Maintenance des machines à café',
  'Professional maintenance and cleaning for all types of coffee machines',
  'صيانة وتنظيف احترافية لجميع أنواع آلات القهوة',
  'Maintenance et nettoyage professionnels pour tous types de machines à café',
  200, 'DH', 'from', 90, 'maintenance', NULL,
  'published', true, '{}', array['maintenance', 'coffee']
where exists (select 1 from public.businesses where slug = 'momia-shop')
  and not exists (
    select 1 from public.services
    where business_id = (select id from public.businesses where slug = 'momia-shop')
      and name = 'Cafe machine maintenance'
  );

insert into public.services (
  business_id, name, name_ar, name_fr, description, description_ar, description_fr,
  price, price_unit, price_type, duration_minutes, category, subcategory,
  status, featured, gallery, tags
)
select
  (select id from public.businesses where slug = 'momia-shop'),
  'Cafe machine repair', 'إصلاح آلات القهوة', 'Réparation des machines à café',
  'Expert repair services for commercial coffee machines',
  'خدمات إصلاح احترافية لآلات القهوة التجارية',
  'Services de réparation experts pour machines à café commerciales',
  350, 'DH', 'from', 120, 'repair', NULL,
  'published', true, '{}', array['repair', 'espresso']
where exists (select 1 from public.businesses where slug = 'momia-shop')
  and not exists (
    select 1 from public.services
    where business_id = (select id from public.businesses where slug = 'momia-shop')
      and name = 'Cafe machine repair'
  );

-- ============================================================================
-- ÉTAPE 5: Produits (slug obligatoire; colonnes localisées ajoutées)
-- ============================================================================
alter table public.products add column if not exists name_ar text;
alter table public.products add column if not exists name_fr text;
alter table public.products add column if not exists description_ar text;
alter table public.products add column if not exists description_fr text;

insert into public.products (
  business_id, category_id, slug, name, name_ar, name_fr,
  description, description_ar, description_fr,
  price, currency, stock, images, status, featured, tags
)
select
  (select id from public.businesses where slug = 'momia-shop'),
  (select id from public.categories where slug = 'equipment'),
  'professional-coffee-machine', 'Professional coffee machine',
  'آلة قهوة احترافية', 'Machine à café professionnelle',
  'High quality professional espresso machine for cafes and restaurants',
  'آلة إسبريسو احترافية عالية الجودة للمقاهي والمطاعم',
  'Machine à espresso professionnelle de haute qualité pour cafés et restaurants',
  1299, 'MAD', 5,
  array['https://placehold.co/600x600/2c3e50/f39c12?text=Espresso+Machine'],
  'published', true, array['espresso', 'coffee-machine']
where exists (select 1 from public.businesses where slug = 'momia-shop')
  and not exists (
    select 1 from public.products where slug = 'professional-coffee-machine'
  );

insert into public.products (
  business_id, category_id, slug, name, name_ar, name_fr,
  description, description_ar, description_fr,
  price, currency, stock, images, status, featured, tags
)
select
  (select id from public.businesses where slug = 'momia-shop'),
  (select id from public.categories where slug = 'equipment'),
  'professional-coffee-grinder', 'Professional coffee grinder',
  'مطحنة قهوة احترافية', 'Broyeur à café professionnel',
  'Precision coffee grinder for perfect espresso extraction',
  'مطحنة قهوة دقيقة لاستخلاص الإسبريسو المثالي',
  'Broyeur à café de précision pour une extraction parfaite de l\'espresso',
  450, 'MAD', 10,
  array['https://placehold.co/600x600/2c3e50/f39c12?text=Grinder'],
  'published', true, array['grinder', 'espresso']
where exists (select 1 from public.businesses where slug = 'momia-shop')
  and not exists (
    select 1 from public.products where slug = 'professional-coffee-grinder'
  );

-- ============================================================================
-- ÉTAPE 6: Review exemple (déclenche aussi le recalcul du rating via le trigger)
-- ============================================================================
-- user_id = profile du propriétaire (seed demo). unique(business_id, user_id).
insert into public.reviews (business_id, user_id, rating, comment, created_at)
select
  (select id from public.businesses where slug = 'momia-shop'),
  '00000000-0000-4000-8000-000000000001',
  5,
  'Excellent service, la machine à café fonctionne parfaitement depuis l\'entretien. Merci !',
  now()
where exists (select 1 from public.businesses where slug = 'momia-shop')
  and not exists (
    select 1 from public.reviews
    where business_id = (select id from public.businesses where slug = 'momia-shop')
      and user_id = '00000000-0000-4000-8000-000000000001'
  );