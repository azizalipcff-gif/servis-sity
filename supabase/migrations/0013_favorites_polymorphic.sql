-- Service City — Phase 9: favorites unification — business + service + product
-- Run after 0012_payments.sql.
--
-- The existing table (created in 0003_v2.sql):
--   favorites (id, user_id NOT NULL, business_id NOT NULL, created_at, UNIQUE (user_id, business_id))
--   RLS: favorites_select_own / favorites_insert_own / favorites_delete_own (user_id = auth.uid())
--   UNIQUE (user_id, business_id) gets the default Postgres name
--   `favorites_user_id_business_id_key` (reused below, not invented).
--
-- Final schema (mirrors the established `follows` typed-target idiom):
--   favorites (id, user_id, business_id NULLABLE, service_id NULLABLE,
--              product_id NULLABLE, item_type NOT NULL, created_at)
--
--  - Existing business rows keep their business_id and get item_type = 'business'
--    (business_id is only made nullable for the new service/product targets).
--  - Exactly one target per row, enforced by favorite_target_check.
--  - Partial unique indexes per item_type prevent duplicate favorites.
--  - RLS stays owner-only (user_id = auth.uid()) — unchanged.

-- 1. business_id becomes nullable so service/product rows can store their own id.
alter table public.favorites
  alter column business_id drop not null;

-- 2. Service / product targets (cascade deletion exactly like business_id).
alter table public.favorites
  add column service_id uuid references public.services(id) on delete cascade;
alter table public.favorites
  add column product_id uuid references public.products(id) on delete cascade;

-- 3. Type discriminator with a CHECK restricted to the three allowed values.
alter table public.favorites
  add column item_type text check (item_type in ('business', 'service', 'product'));

-- 4. Every legacy row is a business favorite (business_id is populated).
update public.favorites
  set item_type = 'business'
  where item_type is null and business_id is not null;

-- 5. Enforce + default the discriminator for new rows.
alter table public.favorites
  alter column item_type set not null;
alter table public.favorites
  alter column item_type set default 'business';

-- 6. Drop the old business-only unique constraint (real constraint name from
--    the table definition in 0003_v2.sql); the partial indexes below own dedup now.
alter table public.favorites
  drop constraint if exists favorites_user_id_business_id_key;

-- 7. Partial unique indexes per item_type (mirror the follows idiom).
--    NOTE: index names are unqualified — PostgreSQL rejects schema-qualified
--    index names with `CREATE INDEX IF NOT EXISTS` (42601).
create unique index if not exists favorites_business_unique
  on public.favorites (user_id, business_id)
  where item_type = 'business';
create unique index if not exists favorites_service_unique
  on public.favorites (user_id, service_id)
  where item_type = 'service';
create unique index if not exists favorites_product_unique
  on public.favorites (user_id, product_id)
  where item_type = 'product';

-- 8. A favorite row must target exactly one item, consistent with item_type.
alter table public.favorites
  add constraint favorites_target_check check (
    (item_type = 'business' and business_id is not null and service_id is null and product_id is null)
    or (item_type = 'service' and service_id is not null and business_id is null and product_id is null)
    or (item_type = 'product' and product_id is not null and business_id is null and service_id is null)
  );

-- 9. RLS is preserved unchanged: SELECT/INSERT/DELETE stay owner-only
--    (user_id = auth.uid()). No new permissive policies are added.