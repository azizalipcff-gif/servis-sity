-- ============================================================================
-- Service City — Search Quality: hybrid_search RPC + searchable_text
--
-- Adds a normalized searchable_text column to businesses/services/products,
-- a pgvector embedding column, and one PL/pgSQL `hybrid_search(..)` RPC that:
--   • semantic: cosine similarity against p_embedding when provided & avail.,
--   • lexical:   trigram-indexed ilike over unaccented searchable_text,
--   • scores and sorts by a 70/30 blend, applies all structured filters.
-- The web route keeps its legacy in-memory path as a fallback when this
-- function is not present (e.g. migration not yet applied).
--
-- Lexical normalization is consistently `unaccent(lower(...))` in BOTH the
-- stored searchable_text and the RPC's query side, so accented French terms
-- ("électricien") match their accent-free forms ("electricien") while the
-- rendered display text keeps its accents. The trigram GIN index is built on
-- the same normalized text, so it is actually used by these predicates.
-- Arabic text is unaffected: unaccent only folds Latin diacritics, never the
-- Arabic script (JS-side normalization in lib/search-quality handles Arabic).
--
-- Assumes a Supabase project: pgvector + pg_trgm + unaccent are available.
-- ============================================================================

create extension if not exists vector;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- ---------------------------------------------------------------------------
-- searchable_text columns + backfill + triggers
-- ---------------------------------------------------------------------------

alter table public.businesses add column if not exists searchable_text text;
alter table public.services   add column if not exists searchable_text text;
alter table public.products   add column if not exists searchable_text text;

alter table public.businesses add column if not exists embedding vector(1536);
alter table public.services   add column if not exists embedding vector(1536);
alter table public.products   add column if not exists embedding vector(1536);

create or replace function public.business_searchable(b public.businesses)
returns text
language sql immutable
as $$
  select
    public.unaccent(lower(coalesce(b.name,'')))
    || ' ' || public.unaccent(lower(coalesce(b.description,'')))
    || ' ' || public.unaccent(lower(coalesce(b.city,'')))
    || ' ' || public.unaccent(lower(coalesce((select c.name_en from public.categories c where c.id = b.category_id),'')))
  ;
$$;

create or replace function public.service_searchable(s public.services)
returns text
language sql immutable
as $$
  select
    public.unaccent(lower(coalesce(s.name,'')))
    || ' ' || public.unaccent(lower(coalesce(s.description,'')))
    || ' ' || public.unaccent(lower(coalesce((select c.name_en from public.businesses b join public.categories c on c.id = b.category_id where b.id = s.business_id),'')))
    || ' ' || public.unaccent(lower(coalesce((select b.name from public.businesses b where b.id = s.business_id),'')))
  ;
$$;

create or replace function public.product_searchable(p public.products)
returns text
language sql immutable
as $$
  select
    public.unaccent(lower(coalesce(p.name,'')))
    || ' ' || public.unaccent(lower(coalesce(p.description,'')))
    || ' ' || public.unaccent(lower(coalesce((select b.name from public.businesses b where b.id = p.business_id),'')))
    || ' ' || public.unaccent(lower(coalesce((select c.name_en from public.categories c where c.id = p.category_id),'')))
  ;
$$;

create or replace function public.set_business_searchable()
returns trigger
language plpgsql
as $$
begin
  new.searchable_text := public.business_searchable(new);
  return new;
end;
$$;

create or replace function public.set_service_searchable()
returns trigger
language plpgsql
as $$
begin
  new.searchable_text := public.service_searchable(new);
  return new;
end;
$$;

create or replace function public.set_product_searchable()
returns trigger
language plpgsql
as $$
begin
  new.searchable_text := public.product_searchable(new);
  return new;
end;
$$;

drop trigger if exists business_searchable_trigger on public.businesses;
create trigger business_searchable_trigger
  before insert or update of name, description, city, category_id on public.businesses
  for each row execute procedure public.set_business_searchable();

drop trigger if exists service_searchable_trigger on public.services;
create trigger service_searchable_trigger
  before insert or update of name, description, business_id on public.services
  for each row execute procedure public.set_service_searchable();

drop trigger if exists product_searchable_trigger on public.products;
create trigger product_searchable_trigger
  before insert or update of name, description, business_id, category_id on public.products
  for each row execute procedure public.set_product_searchable();

-- Backfill existing rows (whole-table refresh keeps blocks small & idempotent).
update public.businesses set searchable_text = public.business_searchable(public.businesses);
update public.services   set searchable_text = public.service_searchable(public.services);
update public.products   set searchable_text = public.product_searchable(public.products);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists businesses_searchable_trgm_idx
  on public.businesses using gin (searchable_text gin_trgm_ops);
create index if not exists services_searchable_trgm_idx
  on public.services using gin (searchable_text gin_trgm_ops);
create index if not exists products_searchable_trgm_idx
  on public.products using gin (searchable_text gin_trgm_ops);

create index if not exists businesses_embedding_idx
  on public.businesses using hnsw (embedding vector_cosine_ops);
create index if not exists services_embedding_idx
  on public.services using hnsw (embedding vector_cosine_ops);
create index if not exists products_embedding_idx
  on public.products using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- hybrid_search RPC
-- ---------------------------------------------------------------------------

create or replace function public.hybrid_search(
  p_embedding vector(1536) default null,
  p_query text default null,
  p_type text default 'all',
  p_city text default null,
  p_category text default null,
  p_min_rating numeric default 0,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_verified boolean default false,
  p_premium boolean default false,
  p_open_now boolean default false,
  p_limit integer default 600
)
returns table(
  kind text,
  id uuid,
  score double precision,
  payload jsonb
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  q text := lower(coalesce(p_query, ''));
  qn text := public.unaccent(lower(coalesce(p_query, '')));
  cat_id uuid := (select id from public.categories where slug = p_category);
  now_min int := extract(hour from localtime)::int * 60 + extract(minute from localtime)::int;
  now_dow int := extract(isodow from localtime)::int % 7;
begin
  -- Guard: no query, no filters → still allow browsing of approved catalog.
  return query
  with ranked as (
    select
      'business'::text as kind,
      b.id,
      case
        when p_embedding is not null and b.embedding is not null
          then (1 - (b.embedding <=> p_embedding)) * 0.7
             + case when qn <> '' and b.searchable_text ilike '%' || qn || '%' then 0.3 else 0 end
        when qn <> '' and b.searchable_text ilike '%' || qn || '%' then 0.6
        when q = '' and p_embedding is null then 0.5
        else 0
      end::double precision as score,
      to_jsonb(b) - 'embedding' - 'searchable_text' as payload
    from public.businesses b
    where b.status = 'approved'
      and p_type in ('all', 'business')
      and (p_city is null or b.city = p_city)
      and (p_category is null or b.category_id = cat_id)
      and (p_min_rating <= 0 or coalesce(b.rating_avg, 0) >= p_min_rating)
      and (not p_verified or b.verified)
      and (not p_premium or b.plan is distinct from 'free')
      and (
        p_min_price is null
        or exists (
          select 1 from public.services sv
          where sv.business_id = b.id and sv.price is not null and sv.price >= p_min_price
        )
      )
      and (
        p_max_price is null
        or exists (
          select 1 from public.services sv
          where sv.business_id = b.id and sv.price is not null and sv.price <= p_max_price
        )
      )
      and (
        not p_open_now
        or exists (
          select 1 from public.business_hours h
          where h.business_id = b.id
            and h.is_closed = false
            and h.open_time is not null and h.close_time is not null
            and h.day_of_week = now_dow
            and now_min between
              (extract(hour from h.open_time)::int * 60 + extract(minute from h.open_time)::int) - 30
              and (extract(hour from h.close_time)::int * 60 + extract(minute from h.close_time)::int)
        )
      )

    union all

    select
      'service'::text,
      sv.id,
      case
        when p_embedding is not null and sv.embedding is not null
          then (1 - (sv.embedding <=> p_embedding)) * 0.7
             + case when qn <> '' and sv.searchable_text ilike '%' || qn || '%' then 0.3 else 0 end
        when qn <> '' and sv.searchable_text ilike '%' || qn || '%' then 0.6
        else 0
      end::double precision,
      to_jsonb(sv) - 'embedding' - 'searchable_text'
        || jsonb_build_object('business', (
          select jsonb_build_object(
            'id', b.id, 'name', b.name, 'slug', b.slug, 'logo_url', b.logo_url,
            'city', b.city, 'verified', b.verified, 'category_id', b.category_id,
            'rating_avg', b.rating_avg, 'reviews_count', b.reviews_count, 'plan', b.plan
          )
          from public.businesses b where b.id = sv.business_id
        ))
    from public.services sv
    where sv.status = 'published'
      and p_type in ('all', 'service')
      and (p_city is null or exists (select 1 from public.businesses b where b.id = sv.business_id and b.city = p_city))
      and (p_category is null or exists (select 1 from public.businesses b where b.id = sv.business_id and b.category_id = cat_id))
      and (p_min_rating <= 0 or exists (select 1 from public.businesses b where b.id = sv.business_id and coalesce(b.rating_avg, 0) >= p_min_rating))
      and (not p_verified or exists (select 1 from public.businesses b where b.id = sv.business_id and b.verified))
      and (not p_premium or exists (select 1 from public.businesses b where b.id = sv.business_id and b.plan is distinct from 'free'))
      and (p_min_price is null or sv.price is not null and sv.price >= p_min_price)
      and (p_max_price is null or sv.price is not null and sv.price <= p_max_price)

    union all

    select
      'product'::text,
      p.id,
      case
        when p_embedding is not null and p.embedding is not null
          then (1 - (p.embedding <=> p_embedding)) * 0.7
             + case when qn <> '' and p.searchable_text ilike '%' || qn || '%' then 0.3 else 0 end
        when qn <> '' and p.searchable_text ilike '%' || qn || '%' then 0.6
        else 0
      end::double precision,
      to_jsonb(p) - 'embedding' - 'searchable_text'
        || jsonb_build_object('business', (
          select jsonb_build_object(
            'id', b.id, 'name', b.name, 'slug', b.slug, 'logo_url', b.logo_url,
            'city', b.city, 'verified', b.verified, 'category_id', b.category_id,
            'rating_avg', b.rating_avg, 'reviews_count', b.reviews_count, 'plan', b.plan
          )
          from public.businesses b where b.id = p.business_id
        ))
    from public.products p
    where p.status = 'published'
      and p_type in ('all', 'product')
      and (p_city is null or exists (select 1 from public.businesses b where b.id = p.business_id and b.city = p_city))
      and (p_category is null or p.category_id = cat_id)
      and (p_min_rating <= 0 or exists (select 1 from public.businesses b where b.id = p.business_id and coalesce(b.rating_avg, 0) >= p_min_rating))
      and (not p_verified or exists (select 1 from public.businesses b where b.id = p.business_id and b.verified))
      and (not p_premium or exists (select 1 from public.businesses b where b.id = p.business_id and b.plan is distinct from 'free'))
      and (p_min_price is null or p.price is not null and p.price >= p_min_price)
      and (p_max_price is null or p.price is not null and p.price <= p_max_price)
  )
  select kind, id, score, payload
  from ranked
  where score > 0
  order by score desc, id
  limit greatest(least(coalesce(p_limit, 600), 1000), 0);
end;
$$;

grant execute on function public.hybrid_search(
  vector(1536), text, text, text, text, numeric, numeric, numeric, boolean, boolean, boolean, integer
) to anon, authenticated;