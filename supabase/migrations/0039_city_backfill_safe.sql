-- Phase 2A: deterministic, SAFE-only businesses.city_id backfill.
--
-- Scope (per approved data-foundation audit):
--   * Only rows with NULL city_id are touched (never overwrite a valid FK).
--   * Only unambiguous (exactly one) city match is applied — no guessing.
--   * All other business columns are preserved.
--   * Idempotent: re-running updates 0 rows once city_id is set.
--
-- Matching is accent- and punctuation-insensitive so free-text `city`
-- values ("Berkane", "El Jadida", "Casablanca") resolve to the canonical
-- cities.row regardless of spacing/hyphens/accents.

create extension if not exists unaccent;  -- trusted, idempotent

with norm as (
  select id,
    regexp_replace(lower(unaccent(coalesce(slug,    ''))), '[^a-z0-9]', '', 'g') as n_slug,
    regexp_replace(lower(unaccent(coalesce(name_en, ''))), '[^a-z0-9]', '', 'g') as n_en,
    regexp_replace(lower(unaccent(coalesce(name_fr, ''))), '[^a-z0-9]', '', 'g') as n_fr,
    regexp_replace(lower(unaccent(coalesce(name_ar, ''))), '[^a-z0-9]', '', 'g') as n_ar
  from cities
),
biz as (
  select b.id,
    regexp_replace(lower(unaccent(coalesce(b.city, ''))), '[^a-z0-9]', '', 'g') as n_city
  from businesses b
  where b.city_id is null
    and b.city is not null
    and btrim(b.city) <> ''
),
match as (
  select biz.id as bid, c.id as city_id,
         count(*) over (partition by biz.id) as n_matches
  from biz
  join norm c on biz.n_city in (c.n_slug, c.n_en, c.n_fr, c.n_ar)
)
update businesses b
set city_id = m.city_id,
    updated_at = now()
from match m
where b.id = m.bid
  and m.n_matches = 1     -- SAFE only: unambiguous
  and b.city_id is null;  -- never overwrite an existing valid city_id
