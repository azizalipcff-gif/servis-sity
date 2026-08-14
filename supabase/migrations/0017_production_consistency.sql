-- Service City — Phase 2 audit: production consistency backfill.
--
-- The live DB was built via the SQL editor; `supabase_migrations.schema_migrations`
-- is empty, so migrations 0012/0014/0015 were never replayed there. This migration
-- converges ONLY the confirmed, non-destructive gaps that affect correctness or
-- security. It is safe to run standalone in the SQL editor AND replayable on a
-- fresh project (idempotent).
--
-- NOT included here (separate phases):
--   • 0012 payments stack — deliberate feature launch, new tables.
--   • 0015 seed data — momia/rossito and QA rows were created via app flows.
--   • Data normalization (city_id backfill, city-slug canonicalization) — data
--     migration run separately under import/launch phase.

-- ============================================================================
-- 1. Security: draft services were publicly readable.
-- `services_select_public ... using (true)` makes EVERY service row (including
-- drafts of unapproved/queued businesses) selectable via the public API. The
-- products table already gates on status+owner; make services consistent.
-- ============================================================================
drop policy if exists services_select_public on public.services;

-- ============================================================================
-- 2. Integrity: favorites.item_type was seeded with a rogue `'business'` default
-- (from 0013, principle removed in 0014 which never ran live). The app layer
-- always sets item_type explicitly (lib/favorites.ts); a bare INSERT could be
-- miscategorized → an untyped favorite returning as a business favorite.
-- ============================================================================
alter table public.favorites
  alter column item_type drop default;

-- ============================================================================
-- 3. Performance: missing lookup indexes from hardening migration 0014
-- (favorites by service/product, follows by business).
-- ============================================================================
create index if not exists favorites_service_id_idx on public.favorites (service_id);
create index if not exists favorites_product_id_idx on public.favorites (product_id);
create index if not exists follows_business_id_idx on public.follows (business_id);