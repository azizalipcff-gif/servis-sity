-- ============================================================================
-- Service City — Phase 2 audit: production data convergence.
--
-- The live DB was built via the SQL editor; `supabase_migrations.schema_migrations`
-- is empty, so migration 0015 (berkane city + maintenance/equipment/repair
-- categories) was never replayed there. The business rows (momia-shop,
-- rossito) were created through app flows, so they carry free-text `city`
-- values and `city_id = NULL`. The search-quality vocabulary
-- (lib/search-quality/vocabularies.ts) already assumes berkane and the three
-- categories exist, and it maps `ménager-services` to an accented slug that the
-- live `categories` table does not have (`menager-services`).
--
-- This migration converges ONLY the confirmed, non-destructive gaps between the
-- live DB and the migration/vocabulary model. It is safe to run standalone in
-- the SQL editor AND replayable on a fresh project (every statement is
-- idempotent). No DROP TABLE, DELETE, or TRUNCATE. No RLS policy changes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. City: berkane (was inserted by 0015, which never ran live).
-- ----------------------------------------------------------------------------
insert into public.cities (slug, name_ar, name_fr, name_en, region, lat, lng, population)
select 'berkane', 'بركان', 'Berkane', 'Berkane', 'Oriental', 34.9219, -2.3160, 109237
where not exists (select 1 from public.cities where slug = 'berkane');

-- ----------------------------------------------------------------------------
-- 2. Categories: maintenance / equipment / repair under services-pro
--    (was inserted by 0015, which never ran live).
-- ----------------------------------------------------------------------------
insert into public.categories (slug, icon, name_ar, name_fr, name_en, parent_id, seo_title, seo_description)
select 'maintenance', 'wrench',
  'صيانة', 'Maintenance', 'Maintenance',
  (select id from public.categories where slug = 'services-pro'),
  'Maintenance au Maroc', 'Maintenance et entretien professionnels au Maroc sur Service City.'
where not exists (select 1 from public.categories where slug = 'maintenance');

insert into public.categories (slug, icon, name_ar, name_fr, name_en, parent_id, seo_title, seo_description)
select 'equipment', 'cpu',
  'معدات', 'Équipement', 'Equipment',
  (select id from public.categories where slug = 'services-pro'),
  'Équipements au Maroc', 'Équipements professionnels au Maroc sur Service City.'
where not exists (select 1 from public.categories where slug = 'equipment');

insert into public.categories (slug, icon, name_ar, name_fr, name_en, parent_id, seo_title, seo_description)
select 'repair', 'hammer',
  'إصلاح', 'Réparation', 'Repair',
  (select id from public.categories where slug = 'services-pro'),
  'Réparation au Maroc', 'Services de réparation au Maroc sur Service City.'
where not exists (select 1 from public.categories where slug = 'repair');

-- ----------------------------------------------------------------------------
-- 3. Re-parent cafe under restaurants.
--    0015 intended `cafe` to live under `restaurants`, but its insert is
--    guarded by "where not exists slug='cafe'" and the row already existed
--    from 0001 — so the re-parent never applied. Idempotent: re-setting the
--    same parent is a no-op.
-- ----------------------------------------------------------------------------
update public.categories
set parent_id = (select id from public.categories where slug = 'restaurants')
where slug = 'cafe'
  and exists (select 1 from public.categories where slug = 'restaurants');

-- ----------------------------------------------------------------------------
-- 4. Backfill businesses.city_id from the cities table.
--    Deferred in 0017 ("data migration run separately"); converge it now.
--    Matches free-text `city` values against the canonical name/slug, so rows
--    created through app flows resolve to a real city foreign key.
-- ----------------------------------------------------------------------------
update public.businesses b
set city_id = c.id
from public.cities c
where b.city_id is null
  and (
    lower(btrim(b.city)) = lower(btrim(c.name_en))
    or lower(btrim(b.city)) = lower(btrim(c.name_fr))
    or lower(btrim(b.city)) = lower(btrim(c.slug))
  );

-- ----------------------------------------------------------------------------
-- 5. Canonicalize businesses.city to the city's canonical English name.
--    Search filters on the free-text `city` column (legacy path) and the
--    vocab resolves city aliases to canonical display names (e.g. "Berkane"),
--    so a lowercase free-text value ("berkane") would otherwise never match.
-- ----------------------------------------------------------------------------
update public.businesses b
set city = c.name_en
from public.cities c
where b.city_id = c.id
  and b.city is distinct from c.name_en;
