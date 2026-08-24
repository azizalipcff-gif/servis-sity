import { requireAdmin } from "@/lib/admin";
import { businessPatchSchema } from "@/lib/validations/admin-schemas";
import { uuidSchema } from "@/lib/validations/schemas";
import type {
  BusinessStatus,
  PlanType,
  VerificationStatus,
} from "@/lib/supabase/database.types";
import { writeAudit, type AuditAction } from "@/lib/security/audit";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { revalidateTag } from "next/cache";
import { parseStoredUrl } from "@/lib/supabase/storage";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function PATCH(request: Request) {
  return withErrorCapture("admin.businesses.patch", async () => {
    const rl = await rateLimit(request, { key: "admin:mutate", limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const guard = await requireAdmin();
    if (!guard) return jsonError(401, "unauthorized");

    const body = await request.json().catch(() => null);
    const parsed = businessPatchSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");

    const { id, status, status_note, plan, verification_status, verified } = parsed.data;

    // Load the current row to record the canonical transition (previous status)
    // and to notify the owner on approval. The authenticated admin is always
    // the reviewer: no client-provided reviewer/id is ever accepted.
    const { data: current, error: readError } = await guard.supabase
      .from("businesses")
      .select("id, name, owner_id, status, status_note")
      .eq("id", id)
      .maybeSingle();
    if (readError || !current) return jsonError(404, "not_found");

    const patch: {
      status?: BusinessStatus;
      status_note?: string | null;
      plan?: PlanType;
      verification_status?: VerificationStatus;
      verified?: boolean;
    } = {};
    if (status) patch.status = status;
    if (status_note !== undefined) patch.status_note = status_note;
    // Approving the listing clears any previous rejection note.
    if (status === "approved") patch.status_note = null;
    if (plan) patch.plan = plan;
    if (verification_status) {
      patch.verification_status = verification_status;
      patch.verified = verification_status === "verified";
    }
    if (verified !== undefined) patch.verified = verified;

    const { error } = await guard.supabase.from("businesses").update(patch).eq("id", id);
    if (error) return jsonError(500, "update_failed");

    // Notify the business owner when their listing is verified.
    if (verification_status === "verified") {
      if (current.owner_id) {
        await guard.supabase.from("notifications").insert({
          recipient_id: current.owner_id,
          type: "verification",
          title: current.name ?? "",
          body: "VERIFIED",
          link: `/dashboard?tab=verification`,
        });
      }
    }

    // Notify the owner when their listing transitions *to* approved by an admin.
    if (status === "approved" && current.status !== "approved" && current.owner_id) {
      await guard.supabase.from("notifications").insert({
        recipient_id: current.owner_id,
        type: "admin",
        title: current.name ?? "",
        body: "APPROVED",
        link: `/dashboard?tab=plan`,
      });
    }

    let action: AuditAction;
    if (status || status_note !== undefined) action = "business.status_change";
    else if (verification_status === "verified") action = "business.verify";
    else if (verification_status === "rejected") action = "business.reject_verification";
    else action = "business.plan_change";

    const metadata: Record<string, unknown> = {};
    if (status) {
      metadata.from = current.status;
      metadata.to = status;
      if (status_note !== undefined) metadata.note = status_note;
    }
    if (plan) metadata.plan = plan;
    if (verification_status) metadata.verification_status = verification_status;

    await writeAudit({
      actorId: guard.admin.id,
      action,
      targetType: "business",
      targetId: id,
      metadata,
    });

    return jsonOk();
  });
}

export async function DELETE(request: Request) {
  return withErrorCapture("admin.businesses.delete", async () => {
    const rl = await rateLimit(request, { key: "admin:mutate", limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const guard = await requireAdmin();
    if (!guard) return jsonError(401, "unauthorized");

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id || !uuidSchema.safeParse(id).success) return jsonError(400, "bad_request");

    // Load the row first so we can clean up its storage objects and confirm it exists.
    const { data: business, error: readError } = await guard.supabase
      .from("businesses")
      .select("id, logo_url, cover_url")
      .eq("id", id)
      .maybeSingle();
    if (readError) return jsonError(500, "delete_failed");
    if (!business) return jsonError(404, "not_found");

    // 1) Delete the database record. RLS restricts this to admins; child rows
    //    cascade or are set null per the FK definitions, so nothing is orphaned.
    const { error } = await guard.supabase.from("businesses").delete().eq("id", id);
    if (error) {
      if (error.code === "23503") return jsonError(409, "delete_blocked_dependents");
      return jsonError(500, "delete_failed");
    }

    // 2) Best-effort storage cleanup (orphaned logo/cover/gallery). Failures are
    //    logged but must never make the successful DB deletion appear to fail.
    await cleanupBusinessStorage(guard.supabase, business, id);

    // 3) Invalidate cached public listings so the deletion is reflected immediately.
    revalidateTag("businesses");
    revalidateTag("services");
    revalidateTag("products");

    // 4) Audit (non-fatal).
    await writeAudit({
      actorId: guard.admin.id,
      action: "business.delete",
      targetType: "business",
      targetId: id,
    });

    return jsonOk();
  });
}

/**
 * Removes the Supabase Storage objects owned by a business (logo, cover image,
 * and gallery media rows). Fully best-effort: any failure is logged and never
 * thrown, so a storage hiccup can never block or mask the database deletion.
 */
async function cleanupBusinessStorage(
  supabase: SupabaseClient,
  business: { logo_url?: string | null; cover_url?: string | null },
  businessId: string,
): Promise<void> {
  const targets: { bucket: string; key: string }[] = [];

  for (const url of [business.logo_url, business.cover_url]) {
    const parsed = parseStoredUrl(url);
    if (parsed) targets.push({ bucket: parsed.bucket, key: parsed.key });
  }

  // Gallery images are tracked in the media table.
  try {
    const { data: media } = await supabase
      .from("media")
      .select("url")
      .eq("business_id", businessId);
    for (const m of media ?? []) {
      const parsed = parseStoredUrl(m.url);
      if (parsed) targets.push({ bucket: parsed.bucket, key: parsed.key });
    }
  } catch (err) {
    console.error(
      "[admin.businesses.delete] media lookup failed during storage cleanup",
      err instanceof Error ? err.message : err,
    );
  }

  await Promise.all(
    targets.map(async (t) => {
      try {
        await supabase.storage.from(t.bucket).remove([t.key]);
      } catch (err) {
        console.error(
          "[admin.businesses.delete] storage remove failed",
          t.bucket,
          t.key,
          err instanceof Error ? err.message : err,
        );
      }
    }),
  );
}