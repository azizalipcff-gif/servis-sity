-- Service City — Data-validation fix: `featured` on products/services is a
-- merchandising entitlement, but it was owner-writable through the client-side
-- products-manager / services-manager (`featured` boolean is sent in every
-- save payload and the products_update_owner / services_update_owner RLS
-- policies allow the owner to UPDATE their own rows). A business owner could
-- therefore self-grant the featured badge + search/homepage boost
-- (lib/queries.ts: getFeaturedProducts / searchProducts / home rails order by
-- `featured`) without paying for the paid featured placements.
--
-- Fix (DB-level, mirrors the entitlement-guard pattern from 0016/0018/0020):
-- non-admins may never set `featured = true`. INSERT forces the safe default
-- (false) and discards any client-supplied value; UPDATE coerces `featured`
-- back to its current value so legitimate owner edits of other fields keep
-- working (the managers always send `featured` in the payload). Admins bypass
-- via is_admin() (site curation).
--
-- Deliberately NOT guarded: the products/services `status` column (draft/
-- published/archived) — owners publish their own listings by design.

create or replace function public.protect_featured_entitlement()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.featured := false;
    return new;
  end if;

  -- UPDATE (and any other op): preserve the current value — a non-admin can
  -- neither self-grant nor strip the featured flag.
  new.featured := old.featured;
  return new;
end;
$$;

drop trigger if exists protect_product_featured_trigger on public.products;
create trigger protect_product_featured_trigger
  before insert or update on public.products
  for each row execute procedure public.protect_featured_entitlement();

drop trigger if exists protect_service_featured_trigger on public.services;
create trigger protect_service_featured_trigger
  before insert or update on public.services
  for each row execute procedure public.protect_featured_entitlement();
