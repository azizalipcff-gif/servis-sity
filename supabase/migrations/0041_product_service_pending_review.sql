-- Products & Services moderation requires a pending state the admin can
-- approve (publish) or reject (archive). The original check constraints only
-- allowed ('draft', 'published', 'archived'), so a pending submission could
-- never be persisted — the moderation queue was unreachable and any
-- "pending" update failed with 23514 (check_violation). Add 'pending_review'.
alter table public.products
  drop constraint if exists products_status_check;
alter table public.products
  add constraint products_status_check
  check (status in ('draft', 'published', 'archived', 'pending_review'));

alter table public.services
  drop constraint if exists services_status_check;
alter table public.services
  add constraint services_status_check
  check (status in ('draft', 'published', 'archived', 'pending_review'));
