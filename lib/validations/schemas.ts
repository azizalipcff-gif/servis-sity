import { z } from "zod";
import { sanitizeText, sanitizeUrl } from "../security/sanitize.ts";

/** Standard UUID string (Postgres uuid). */
export const uuidSchema = z.string().uuid("invalidId");

/** http(s) URL, trimmed — rejects javascript:/data:/other schemes. */
export const httpUrlSchema = z
  .string()
  .max(2000)
  .refine((v) => sanitizeUrl(v) !== "", "invalidUrl");

export const emailSchema = z
  .string()
  .min(1, "required")
  .email("invalid")
  .max(254);

export const passwordSchema = z
  .string()
  .min(6, "minLength")
  .max(72);

export const phoneSchema = z
  .string()
  .min(8, "minLength")
  .max(20)
  .regex(/^[0-9+ ]+$/, "invalidPhone");

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: z.string().min(2, "minLength").max(120),
  phone: phoneSchema.optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  role: z.enum(["owner", "client"]).default("owner"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export const businessSchema = z.object({
  name: z.string().min(2, "minLength").max(120),
  category_id: z.string().uuid("required"),
  slug: z
    .string()
    .min(2, "minLength")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "invalidSlug"),
  description: z.string().max(3000).optional().or(z.literal("")),
  phone: phoneSchema.optional().or(z.literal("")),
  whatsapp: phoneSchema.optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

export type BusinessInput = z.infer<typeof businessSchema>;

export const serviceSchema = z.object({
  name: z.string().min(1, "required").max(120),
  price: z.coerce.number().min(0).nullable().optional(),
  duration_minutes: z.coerce.number().int().min(0).nullable().optional(),
});

export type ServiceInput = z.infer<typeof serviceSchema>;

export const bookingSchema = z.object({
  business_id: z.string().uuid(),
  service_id: z.string().uuid().optional().nullable(),
  client_name: z.string().min(2, "minLength").max(120),
  client_phone: phoneSchema,
  booking_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "invalidDate"),
  booking_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "invalidTime"),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const reviewSchema = z.object({
  business_id: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z
    .string()
    .transform((v) => sanitizeText(v, 2000))
    .optional()
    .or(z.literal("")),
});

export const replySchema = z.object({
  review_id: z.string().uuid(),
  reply: z
    .string()
    .min(1, "required")
    .max(2000)
    .transform((v) => sanitizeText(v, 2000)),
});

export const reportSchema = z.object({
  business_id: z.string().uuid(),
  reason: z
    .string()
    .min(3, "required")
    .max(500)
    .transform((v) => sanitizeText(v, 500)),
});

export const bookingPatchSchema = z.object({
  booking_id: z.string().uuid(),
  status: z.enum([
    "confirmed",
    "accepted",
    "rejected",
    "completed",
    "cancelled",
  ]),
});

export const mediaCreateSchema = z.object({
  url: z.string().url().max(2000),
  type: z.enum(["image", "video"]),
});

export const verificationSchema = z.object({
  business_id: z.string().uuid(),
  id_document_url: z.string().url().max(2000).nullable().optional(),
  activity_document_url: z.string().url().max(2000).nullable().optional(),
  license_url: z.string().url().max(2000).nullable().optional(),
  tax_document_url: z.string().url().max(2000).nullable().optional(),
  notes: z.string().max(2000).optional(),
});

export const verificationRequestSchema = z.object({
  businessId: uuidSchema,
  idDocumentUrl: httpUrlSchema.nullable().optional(),
  activityDocumentUrl: httpUrlSchema.nullable().optional(),
  licenseUrl: httpUrlSchema.nullable().optional(),
  taxDocumentUrl: httpUrlSchema.nullable().optional(),
  notes: z.string().max(2000).optional(),
});

export const featuredPurchaseSchema = z.object({
  businessId: uuidSchema,
  surface: z.enum(["homepage", "category", "search"]).default("search"),
});

export const couponPreviewSchema = z.object({
  code: z.string().min(1, "required").max(40),
  planCode: z.string().min(1, "required").max(40),
  subtotalCents: z.coerce.number().int().min(0).max(100_000_000).default(0),
});
