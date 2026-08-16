-- ============================================================================
-- 0026_duplicate_protection.sql
--
-- Production readiness audit (duplicate protection + data validation):
--
-- Live constraint inventory showed several tables had PK-only protection with
-- no way to prevent duplicate/racing inserts. Confirmed gaps fixed here:
--
--   1. services: NO unique constraint at all -> the services-manager could
--      create the same (business_id, name) service twice. FIX: UNIQUE index on
--      (business_id, name) — a business can no longer register the same named
--      service twice.
--
--   2. featured_businesses: only PK. The featured purchase route does a
--      check-then-insert (race): two concurrent POSTs both pass the "pending
--      slot exists?" check and both insert pending rows. Also nothing stops two
--      ACTIVE slots for the same (business_id, surface). FIX: partial UNIQUE
--      index on (business_id, surface) WHERE status IN ('active','pending').
--
--   3. verification_requests: only PK. The verification submit route does a
--      check-then-insert (race) that can produce two pending rows for the same
--      business. FIX: partial UNIQUE index on (business_id) WHERE status
--      = 'pending' (one pending verification per business). Also add a CHECK to
--      pin the status values the app actually writes.
--
--   4. bookings: only PK. A double-submit (or network retry) can create two
--      identical pending bookings for the same client/slot. FIX: partial UNIQUE
--      index on (business_id, booking_date, booking_time, client_phone) WHERE
--      status IN ('pending','confirmed','accepted') — the same person/slot/date
--      cannot be booked twice while the first booking is still live.
--
-- Reversible: drop the indexes/constraint to restore pre-fix state. No DROP
-- TABLE, DELETE, or TRUNCATE. No RLS policy changes. Tables are empty at audit
-- time, so no data migration is required.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. services: one service per (business_id, name)
-- ----------------------------------------------------------------------------
create unique index if not exists services_business_name_key
  on public.services (business_id, name);

-- ----------------------------------------------------------------------------
-- 2. featured_businesses: one active-or-pending slot per (business_id, surface)
-- ----------------------------------------------------------------------------
create unique index if not exists featured_businesses_single_slot_key
  on public.featured_businesses (business_id, surface)
  where status in ('active', 'pending');

-- ----------------------------------------------------------------------------
-- 3. verification_requests: one pending request per business + status CHECK
-- ----------------------------------------------------------------------------
create unique index if not exists verification_requests_pending_business_key
  on public.verification_requests (business_id)
  where status = 'pending';

alter table public.verification_requests
  add constraint verification_requests_status_check
  check (status in ('pending', 'verified', 'rejected'));

-- ----------------------------------------------------------------------------
-- 4. bookings: one live booking per client + slot
-- ----------------------------------------------------------------------------
create unique index if not exists bookings_live_booking_key
  on public.bookings (business_id, booking_date, booking_time, client_phone)
  where status in ('pending', 'confirmed', 'accepted');
