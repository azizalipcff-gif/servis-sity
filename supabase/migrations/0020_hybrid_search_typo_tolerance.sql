-- ============================================================================
-- Search Quality: typo tolerance for hybrid_search
--
-- The original hybrid_search (migration 0019) only matched queries via
-- substring `ilike` over the trigram-indexed `searchable_text`. That means a
-- misspelling such as "plomblier" / "restaurent" / "coifeur" returned zero
-- rows even though pg_trgm was enabled. This migration REPLACES the function
-- with an identical body that ALSO awards a (lower) lexical score when
-- `similarity(searchable_text, qn) > 0.3`, so exact substring matches still
-- outrank fuzzy ones (0.6 vs 0.4) while typos now resolve.
--
-- No signature, filter, or return-shape change — purely additive scoring.
-- ============================================================================

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
  -- Guard: no query, no filters — still allow browsing of approved catalog.
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
        when qn <> '' and similarity(b.searchable_text, qn) > 0.3 then 0.4
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
        when qn <> '' and similarity(sv.searchable_text, qn) > 0.3 then 0.4
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
        when qn <> '' and similarity(p.searchable_text, qn) > 0.3 then 0.4
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
