-- Service City — Phase 10: Production Hardening
-- Run after 0013_favorites_polymorphic.sql.
-- This migration applies critical fixes identified during the pre-launch audit.

-- ==========================================================================
-- P0: Data Integrity: Remove risky default from polymorphic `favorites` table.
-- The application layer MUST explicitly set the `item_type` on insert.
-- This prevents new `service` or `product` favorites from being corrupted.
-- ==========================================================================
alter table public.favorites
  alter column item_type drop default;

-- ==========================================================================
-- P1: Performance: Add missing indexes for high-traffic query patterns.
-- These support fetching followers for a business and favorites for a service/product.
-- ==========================================================================
create index if not exists favorites_service_id_idx on public.favorites (service_id);
create index if not exists favorites_product_id_idx on public.favorites (product_id);
create index if not exists follows_business_id_idx on public.follows (business_id);

-- ==========================================================================
-- P1: Data Integrity: Remove demo/test coupon from migrations.
-- Production coupons should be managed via an admin UI, not in schema files.
-- ==========================================================================
delete from public.coupons where code = 'WELCOME10';