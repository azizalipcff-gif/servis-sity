import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { verificationRequestSchema } from "@/lib/validations/schemas";
import { VERIFICATION_BUCKET } from "@/lib/verification/docs";

export const dynamic = "force-dynamic";

/** Storage paths must sit inside the signed-in owner's own folder. */
function assertOwnVerificationPaths(
  values: (string | null | undefined)[],
  userId: string,
): boolean {
  const prefix = `${VERIFICATION_BUCKET}/${userId}/`;
  return values.every((value) => {
    if (!value) return true;
    if (!value.startsWith(`${VERIFICATION_BUCKET}/`)) return true; // hosted URL
    return value.startsWith(prefix);
  });
}

export async function POST(req: NextRequest) {
  return withErrorCapture("billing.verification", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");

    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const body = await req.json().catch(() => null);
    const parsed = verificationRequestSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");

    const { businessId } = parsed.data;
    const { data: owner } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!owner) return jsonError(403, "forbidden");

    // Reject storage paths that reference another user's verification folder.
    if (
      !assertOwnVerificationPaths(
        [
          parsed.data.idDocumentUrl,
          parsed.data.activityDocumentUrl,
          parsed.data.licenseUrl,
          parsed.data.taxDocumentUrl,
        ],
        user.id,
      )
    ) {
      return jsonError(403, "forbidden");
    }

    const { data: existing } = await supabase
      .from("verification_requests")
      .select("id,status")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing && existing.status === "pending")
      return jsonError(409, "already_pending");

    const payload: Record<string, unknown> = {
      business_id: businessId,
      status: "pending",
      created_at: new Date().toISOString(),
    };
    if (parsed.data.idDocumentUrl) payload.id_document_url = parsed.data.idDocumentUrl;
    if (parsed.data.activityDocumentUrl) payload.activity_document_url = parsed.data.activityDocumentUrl;
    if (parsed.data.licenseUrl) payload.license_url = parsed.data.licenseUrl;
    if (parsed.data.taxDocumentUrl) payload.tax_document_url = parsed.data.taxDocumentUrl;
    if (parsed.data.notes) payload.notes = parsed.data.notes;

    if (existing) {
      const { error } = await supabase
        .from("verification_requests")
        .update(payload as never)
        .eq("id", existing.id);
      if (error) return jsonError(500, "update_failed");
    } else {
      // Concurrent double-submit: the partial unique index
      // (business_id) WHERE status='pending' rejects the second insert with
      // 23505. Treat it as the same "already pending" outcome as above.
      const { error } = await supabase
        .from("verification_requests")
        .insert(payload as never);
      if (error) {
        if ((error as { code?: string }).code === "23505") {
          return jsonError(409, "already_pending");
        }
        return jsonError(500, "insert_failed");
      }
    }

    return jsonOk({ ok: true, submitted: true });
  });
}