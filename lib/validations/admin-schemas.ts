import { z } from "zod";

export const userPatchSchema = z
  .object({
    id: z.string().uuid(),
    role: z.enum(["client", "owner", "admin"]).optional(),
    banned: z.boolean().optional(),
    suspended: z.boolean().optional(),
  })
  .refine((d) => d.role !== undefined || d.banned !== undefined || d.suspended !== undefined, {
    message: "empty_patch",
  });

export const businessPatchSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(["approved", "pending_review", "rejected", "suspended"]).optional(),
    plan: z.enum(["free", "premium", "pro"]).optional(),
    verification_status: z.enum(["none", "pending", "verified", "rejected"]).optional(),
    verified: z.boolean().optional(),
    /** Moderation note (e.g. rejection reason). Trimmed, length-capped. */
    status_note: z
      .union([
        z.string().trim().min(1).max(500),
        z.null(),
        z.undefined(),
      ])
      .optional(),
  })
  .refine(
    (v) =>
      v.status !== undefined ||
      v.plan !== undefined ||
      v.verification_status !== undefined ||
      v.verified !== undefined ||
      v.status_note !== undefined,
    { message: "empty_patch" },
  );

export const reportPatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "reviewed", "resolved"]).optional(),
  action: z.enum(["dismiss", "remove_listing", "suspend_owner"]).optional(),
}).refine((v) => v.status !== undefined || v.action !== undefined, {
  message: "empty_patch",
});

export const categoryCreateSchema = z.object({
  name: z.string().min(2, "required").max(80),
  slug: z
    .string()
    .optional()
    .transform((v) => v?.toLowerCase().replace(/\s+/g, "-")),
  name_en: z.union([z.literal(""), z.string().min(1).max(80)]).optional(),
  name_fr: z.union([z.literal(""), z.string().min(1).max(80)]).optional(),
  name_ar: z.union([z.literal(""), z.string().min(1).max(80)]).optional(),
  icon: z.string().max(40).optional().nullable(),
});

export const cityCreateSchema = z.object({
  name: z.string().min(2, "max").max(80),
  slug: z
    .string()
    .optional()
    .transform((v) => v?.toLowerCase().replace(/\s+/g, "-")),
  name_en: z.union([z.literal(""), z.string().min(1).max(80)]).optional(),
  name_fr: z.union([z.literal(""), z.string().min(1).max(80)]).optional(),
  name_ar: z.union([z.literal(""), z.string().min(1).max(80)]).optional(),
});

export const planCreateSchema = z.object({
  plan_key: z.enum(["free", "premium", "enterprise"]),
  interval: z.enum(["monthly", "quarterly", "yearly", "lifetime"]),
  name: z.string().min(1, "required").max(120),
  price_cents: z.coerce.number().int().min(0).default(0),
  currency: z.string().min(3).max(3).default("MAD"),
  trial_days: z.coerce.number().int().min(0).default(0),
  sort_order: z.coerce.number().int().default(99),
  active: z.boolean().default(true),
  limits: z.record(z.string(), z.unknown()).default({}),
  features: z.record(z.string(), z.unknown()).default({}),
});

export const planPatchSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1, "required").max(120).optional(),
    price_cents: z.coerce.number().int().min(0).optional(),
    currency: z.string().min(3).max(3).optional(),
    trial_days: z.coerce.number().int().min(0).optional(),
    sort_order: z.coerce.number().int().optional(),
    active: z.boolean().optional(),
    limits: z.record(z.string(), z.unknown()).optional(),
    features: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.price_cents !== undefined ||
      v.currency !== undefined ||
      v.trial_days !== undefined ||
      v.sort_order !== undefined ||
      v.active !== undefined ||
      v.limits !== undefined ||
      v.features !== undefined,
    { message: "empty_patch" },
  );

export const couponCreateSchema = z.object({
  code: z.string().min(2, "required").max(40),
  type: z.enum(["percent", "fixed"]),
  value: z.coerce.number().min(0, "invalid"),
  applies_to: z.enum(["any", "plans"]).default("any"),
  active: z.boolean().optional(),
  max_usage: z.coerce.number().int().min(1).nullable().optional(),
  per_user_limit: z.coerce.number().int().min(1).optional(),
  expires_at: z
    .string()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "invalidDate")
    .nullable()
    .optional(),
  amount_total_cents: z.coerce.number().int().min(0).optional(),
  period: z.enum(["one_time", "recurring", "forever"]).default("one_time"),
  plans: z.record(z.string(), z.unknown()).optional(),
});

export const couponPatchSchema = z
  .object({
    id: z.string().uuid(),
    active: z.boolean().optional(),
    max_usage: z.coerce.number().int().min(1).nullable().optional(),
    expires_at: z
      .string()
      .refine((v) => !Number.isNaN(new Date(v).getTime()), "invalidDate")
      .nullable()
      .optional(),
  })
  .refine(
    (v) => v.active !== undefined || v.max_usage !== undefined || v.expires_at !== undefined,
    { message: "empty_patch" },
  );

export const paymentPatchSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["confirm", "refund"]),
  note: z.string().max(1000).optional().nullable(),
});

/**
 * Admin manual subscription grant / manual billing.
 * The client only ever supplies the target business, the plan, and (for a
 * manual cash/bank payment) the amount/method/reference. Subscription status,
 * plan, payment status, billing amount and entitlements are all derived
 * server-side inside `finalizeSuccessfulPayment` — never trusted from input.
 */
export const subscriptionGrantSchema = z.object({
  business_id: z.string().uuid(),
  plan_key: z.enum(["free", "premium", "pro", "enterprise"]),
  interval: z.enum(["monthly", "quarterly", "yearly", "lifetime"]),
  mode: z.enum(["grant", "manual_billing"]).default("grant"),
  amount_cents: z.coerce.number().int().min(0).optional(),
  currency: z.string().length(3).optional(),
  method: z.string().max(40).optional(),
  reference: z.string().max(120).optional(),
  note: z.string().max(1000).optional(),
  coupon_id: z.string().uuid().optional(),
});

export const verificationPatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["approved", "rejected", "request_changes"]),
  note: z.string().max(2000).optional().nullable(),
});

export const featuredPatchSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "revoke", "renew"]),
});

/** Approve (publish) or reject (archive) a pending service submission. */
export const serviceModerationSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["published", "archived"]),
  status_note: z
    .union([z.string().trim().min(1).max(500), z.null(), z.undefined()])
    .optional(),
});

/** Approve (publish) or reject (archive) a pending product submission. */
export const productModerationSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["published", "archived"]),
  status_note: z
    .union([z.string().trim().min(1).max(500), z.null(), z.undefined()])
    .optional(),
});