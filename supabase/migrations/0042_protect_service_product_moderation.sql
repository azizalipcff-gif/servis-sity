-- P0: Services/Products moderation hardening.
--
-- 1) Persist moderation rejection reasons on services & products (businesses
--    already had `status_note`). Without this column the admin reject reason
--    was only stored in audit_logs metadata and never surfaced on the row.
-- 2) Fix the invalid default: migration 0040 set the default to 'pending' but
--    0041 narrowed the CHECK to ('draft','published','archived','pending_review'),
--    so any insert that omitted an explicit status failed with 23514. Align the
--    default to 'pending_review'.
-- 3) Block owners from self-publishing (status -> 'published') or writing
--    moderation notes. Mirrors protect_business_admin_fields (0016) so the
--    moderation queue cannot be bypassed from the owner dashboard.

alter table public.services add column if not exists status_note text;
alter table public.products add column if not exists status_note text;

alter table public.services alter column status set default 'pending_review';
alter table public.products alter column status set default 'pending_review';

create or replace function public.protect_service_product_admin_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  -- Owners may manage their own content but never flip a submission to the
  -- publicly-visible 'published' state themselves.
  if new.status is distinct from old.status and new.status = 'published' then
    raise exception 'only admin can publish a service or product';
  end if;
  -- Moderation notes are admin-only.
  if new.status_note is distinct from old.status_note then
    raise exception 'only admin can set moderation notes';
  end if;
  return new;
end;
$$;

drop trigger if exists services_protect_admin on public.services;
create trigger services_protect_admin
  before insert or update on public.services
  for each row execute function public.protect_service_product_admin_fields();

drop trigger if exists products_protect_admin on public.products;
create trigger products_protect_admin
  before insert or update on public.products
  for each row execute function public.protect_service_product_admin_fields();
