/**
 * Canonical moderation status for owner-created services and products.
 *
 * The database CHECK constraint (migrations 0041_product_service_pending_review.sql
 * and 0042_protect_service_product_moderation.sql) only permits
 *   ('draft', 'published', 'archived', 'pending_review')
 * for both `services.status` and `products.status`.
 *
 * `pending` is NOT a valid value and raises a CHECK violation
 * (SQLSTATE 23514). The default for a freshly created service/product is
 * `pending_review` (awaiting moderation), which also unblocks the owner's
 * publishing capabilities immediately after creation.
 */

export const SERVICE_MOD_STATUS = [
  "draft",
  "published",
  "archived",
  "pending_review",
] as const;

export const PRODUCT_MOD_STATUS = [
  "draft",
  "published",
  "archived",
  "pending_review",
] as const;

export const SERVICE_STATUSES: readonly string[] = [...SERVICE_MOD_STATUS];
export const PRODUCT_STATUSES: readonly string[] = [...PRODUCT_MOD_STATUS];

export const SERVICE_DEFAULT_STATUS = "pending_review";
export const PRODUCT_DEFAULT_STATUS = "pending_review";
