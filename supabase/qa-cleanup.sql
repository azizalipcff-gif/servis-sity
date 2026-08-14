-- =============================================================================
-- QA CLEANUP — Service City (isolated dev/QA data removal)
--
-- Counterpart of supabase/qa-seed.sql. NOT a production migration and it does
-- NOT touch migrations, RLS, or schema. Deletes ONLY the records that
-- supabase/qa-seed.sql inserted, each guarded by exact id + slug + business:
--
--     1. QA product  "Professional coffee machine" (slug professional-coffee-machine)
--     2. QA service  "Coffee machine maintenance"  (idempotent; already absent)
--
-- momia shop, its logo/cover, its real review/rating, categories, users, and
-- every other table are left untouched. Apply with:
--
--     supabase db query --linked --file supabase/qa-cleanup.sql
--
-- Audited before writing: the QA product had NO dependent rows (favorites are
-- business-only here, no featured_products table, media is business-only, no
-- bookings) and NO storage objects (its image is an external placehold.co URL).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. QA product — exact id + slug + momia-shop business guard
-- -----------------------------------------------------------------------------
delete from public.products p
using public.businesses b
where p.business_id = b.id
  and b.slug = 'momia-shop'
  and p.slug = 'professional-coffee-machine'
  and p.id = 'f98b0756-9455-45d4-aba1-6ecd395ed21e';

-- -----------------------------------------------------------------------------
-- 2. QA service — exact id + name + momia-shop business guard (idempotent)
-- -----------------------------------------------------------------------------
delete from public.services s
using public.businesses b
where s.business_id = b.id
  and b.slug = 'momia-shop'
  and s.name = 'Coffee machine maintenance'
  and s.id = '94abbd5d-10d6-4433-b17e-d0e390bac31c';