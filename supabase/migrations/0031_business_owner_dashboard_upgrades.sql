-- ============================================================================
-- 0031_business_owner_dashboard_upgrades.sql
--
-- Business Owner Dashboard Upgrade — schema layer. Additive only: no DROP
-- TABLE, no DELETE, no TRUNCATE, no RLS weakening, no changes to billing or
-- payment tables.
--
--   • businesses:  whatsapp_url + whatsapp_enabled (public WhatsApp CTA gate)
--   • services:    category_id, tags, old_price (discount display)
--   • analytics_events: visitor_key (dedup) + booking_created event type
--   • storage:     private `verification-documents` bucket (owner + admin only,
--                  NO public read) with owner-scoped write + owner/admin read
--                  so owners/admins can mint short-lived signed URLs.
--
-- Reversible: drop the new columns/indexes/policies and the bucket (or set the
-- bucket public=false → true) to restore pre-fix state.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. businesses: WhatsApp public-link controls
-- ----------------------------------------------------------------------------
alter table public.businesses
  add column if not exists whatsapp_url text,
  add column if not exists whatsapp_enabled boolean not null default false;

-- ----------------------------------------------------------------------------
-- 2. services: category, tags, discount price
-- ----------------------------------------------------------------------------
alter table public.services
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists tags text[] not null default '{}',
  add column if not exists old_price numeric;

create index if not exists services_category_id_idx on public.services (category_id);

-- ----------------------------------------------------------------------------
-- 3. analytics_events: booking_created + visitor_key view dedup
-- ----------------------------------------------------------------------------
alter table public.analytics_events
  drop constraint if exists analytics_events_event_type_check;

alter table public.analytics_events
  add constraint analytics_events_event_type_check
  check (event_type in ('view', 'whatsapp_click', 'call_click', 'lead', 'photo_view', 'booking_created'));

alter table public.analytics_events
  add column if not exists visitor_key text;

-- One VIEW per (business, visitor) per visit: a page reload must not inflate
-- the view counter. All other event types count every occurrence.
create unique index if not exists analytics_events_view_dedup_key
  on public.analytics_events (business_id, visitor_key)
  where event_type = 'view' and visitor_key is not null and visitor_key <> '';

-- ----------------------------------------------------------------------------
-- 4. Private verification-documents bucket (owner + admin only)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('verification-documents', 'verification-documents', false)
on conflict (id) do nothing;

-- Owner may write inside their own folder ({auth.uid()}/docs/...).
create policy "verification_documents_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'verification-documents'
    and (select auth.uid()::text) = (storage.foldername(name))[1]
  );

create policy "verification_documents_owner_update" on storage.objects
  for update using (
    bucket_id = 'verification-documents'
    and (select auth.uid()::text) = (storage.foldername(name))[1]
  );

create policy "verification_documents_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'verification-documents'
    and (select auth.uid()::text) = (storage.foldername(name))[1]
  );

-- Owner/admins may read their own objects — required to mint short-lived
-- signed URLs from the app session. There is deliberately NO public read
-- policy: documents stay private.
create policy "verification_documents_owner_select" on storage.objects
  for select using (
    bucket_id = 'verification-documents'
    and (select auth.uid()::text) = (storage.foldername(name))[1]
  );

create policy "verification_documents_admin_all" on storage.objects
  for all using (public.is_admin() and bucket_id = 'verification-documents');