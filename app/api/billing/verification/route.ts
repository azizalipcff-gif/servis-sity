import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withErrorCapture("billing.verification", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");

    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const body = (await req.json().catch(() => ({}))) as {
      businessId?: string;
      idDocumentUrl?: string;
      activityDocumentUrl?: string;
      licenseUrl?: string;
      taxDocumentUrl?: string;
      notes?: string;
    };
    if (!body.businessId) return jsonError(400, "bad_request");

    const { data: owner } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", body.businessId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!owner) return jsonError(403, "forbidden");

    const { data: existing } = await supabase
      .from("verification_requests")
      .select("id,status")
      .eq("business_id", body.businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing && existing.status === "pending")
      return jsonError(409, "already_pending");

    const payload: Record<string, unknown> = {
      business_id: body.businessId,
      status: "pending",
      created_at: new Date().toISOString(),
    };
    if (body.idDocumentUrl) payload.id_document_url = body.idDocumentUrl;
    if (body.activityDocumentUrl) payload.activity_document_url = body.activityDocumentUrl;
    if (body.licenseUrl) payload.license_url = body.licenseUrl;
    if (body.taxDocumentUrl) payload.tax_document_url = body.taxDocumentUrl;
    if (body.notes) payload.notes = body.notes;

    if (existing) {
      await supabase.from("verification_requests").update(payload as never).eq("id", existing.id);
    } else {
      await supabase.from("verification_requests").insert(payload as never);
    }

    return jsonOk({ ok: true, submitted: true });
  });
}