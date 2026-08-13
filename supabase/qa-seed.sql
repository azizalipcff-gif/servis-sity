-- =============================================================================
-- QA SEED — Service City (isolated dev/QA data)
--
-- NOT a production migration. Lives outside supabase/migrations/ on purpose:
-- it only seeds the records needed to exercise the public service + product
-- UI during local QA, against the ALREADY-linked dev project. Apply with:
--
--     supabase db query --linked --file supabase/qa-seed.sql
--
-- Target: business `momia-shop` (seeded separately in the linked project).
-- Guards are idempotent: safe to re-run.
--
-- NOTE: columns below match the LIVE schema exactly (the app's services /
-- products tables have no localized-name columns and services has no
-- `created_at` — ordering relies on `updated_at`).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Service — "Coffee machine maintenance" (published, from 200 DH)
-- -----------------------------------------------------------------------------
insert into public.services (
  business_id, name, price, duration_minutes, description, photo_url,
  status, gallery, featured, updated_at
)
select
  b.id, 'Coffee machine maintenance', 200, 90,
  'Professional maintenance and cleaning for all types of coffee machines.',
  'https://placehold.co/900x600/2c3e50/f39c12?text=Coffee+Machine+Maintenance',
  'published', array[]::text[], true, now()
from public.businesses b
where b.slug = 'momia-shop'
  and not exists (
    select 1 from public.services s
    where s.business_id = b.id and s.name = 'Coffee machine maintenance'
  );

-- -----------------------------------------------------------------------------
-- 2. Product — "Professional coffee machine" (1299 MAD, in stock, published)
-- -----------------------------------------------------------------------------
insert into public.products (
  business_id, category_id, slug, name, description,
  price, currency, stock, images, status, featured, tags, created_at, updated_at
)
select
  b.id,
  (select category_id from public.businesses where slug = 'momia-shop' limit 1),
  'professional-coffee-machine',
  'Professional coffee machine',
  'High quality professional espresso machine for cafes and restaurants.',
  1299, 'MAD', 5,
  array['https://placehold.co/900x700/2c3e50/f39c12?text=Espresso+Machine'],
  'published', true, array['espresso', 'coffee-machine'], now(), now()
from public.businesses b
where b.slug = 'momia-shop'
  and not exists (
    select 1 from public.products p where p.slug = 'professional-coffee-machine'
  );