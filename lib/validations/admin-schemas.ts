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
  })
  .refine(
    (v) =>
      v.status !== undefined ||
      v.plan !== undefined ||
      v.verification_status !== undefined ||
      v.verified !== undefined,
    { message: "empty_patch" },
  );

export const reportPatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "reviewed", "resolved"]),
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