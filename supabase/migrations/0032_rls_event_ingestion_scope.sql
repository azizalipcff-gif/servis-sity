-- 0032 — RLS hardening for event-ingestion tables.
--
-- Migrations 0001/0004 shipped world-writable INSERT policies
-- (analytics_insert_public on analytics_events, system_logs_insert_any on
-- system_logs) as `with check (true)`. Anyone with an anon key could insert
-- rows for ANY business (or arbitrary 3000-char log lines) — verified live.
--
-- All production writers now go through the server-only (service-role) client
-- (app/api/analytics/track, app/api/bookings, app/api/log, lib/security/logger),
-- so no client ever needs to INSERT these tables. These policies still exist
-- for defense-in-depth but are scoped so a client write is possible only for
-- an APPROVED business (analytics) or rows matching the API's own zod bounds
-- (system_logs).

-- ----------------------------------------------------------------------------
-- analytics_events
-- ----------------------------------------------------------------------------
drop policy if exists "analytics_insert_public" on public.analytics_events;

-- Keep public tracking functional for any future session-client writer while
-- closing the world-write: events may only reference a business that is
-- approved (publicly listed). Event type checking stays on the column CHECK
-- constraint (incl. booking_created from migration 0031).
create policy "analytics_insert_approved_business" on public.analytics_events
  for insert with check (
    exists (
      select 1 from public.businesses b
      where b.id = analytics_events.business_id
        and b.status = 'approved'
    )
  );

-- ----------------------------------------------------------------------------
-- system_logs
-- ----------------------------------------------------------------------------
drop policy if exists "system_logs_insert_any" on public.system_logs;

-- Cap rows to the bounds the API itself enforces (app/api/log zod schema and
-- lib/security/logger.toError) so a client cannot bloat the log table.
create policy "system_logs_insert_bounded" on public.system_logs
  for insert with check (
    level in ('error', 'warn')
    and char_length(message) <= 2000
    and char_length(coalesce(context, '')) <= 120
    and char_length(coalesce(stack, '')) <= 8000
  );