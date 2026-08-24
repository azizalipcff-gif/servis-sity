-- Extend Services & Products with a 'pending' moderation state so new
-- submissions route through the same admin moderation workflow as Businesses.
-- (Businesses use 'pending_review'; services/products use 'pending'.)

-- Services
alter table services drop constraint if exists services_status_check;
alter table services add constraint services_status_check
  check (status in ('draft', 'published', 'archived', 'pending'));
alter table services alter column status set default 'pending';

-- Products
alter table products drop constraint if exists products_status_check;
alter table products add constraint products_status_check
  check (status in ('draft', 'published', 'archived', 'pending'));
alter table products alter column status set default 'pending';
