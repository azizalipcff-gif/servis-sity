import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { assertSameOrigin } from "@/lib/security/csrf";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { logError } from "@/lib/security/logger";
import { parseStoredUrl } from "@/lib/supabase/storage";
import { revalidateTag } from "next/cache";
import { uuidSchema } from "@/lib/validations/schemas";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorCapture("dashboard.services.delete", async () => {
    const rl = await rateLimit(request, {
      key: "dashboard:delete",
      limit: 30,
      windowMs: 60_000,
    });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const { id } = await params;
    if (!id || !uuidSchema.safeParse(id).success) {
      return jsonError(400, "bad_request");
    }

    const supabase = await createClient();

    // RLS scopes this read: a non-owner can only see PUBLISHED rows, so an
    // archived service is returned ONLY when the caller owns (or administers)
    // the underlying business. That is the server-side ownership check.
    const { data: service, error: readError } = await supabase
      .from("services")
      .select("id, status, photo_url")
      .eq("id", id)
      .maybeSingle();
    if (readError) {
      logError("[dashboard.services.delete] select failed", readError);
      return jsonError(500, "delete_failed");
    }
    if (!service) return jsonError(404, "not_found");

    if (service.status !== "archived") return jsonError(409, "not_archived");

    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      logError("[dashboard.services.delete] delete failed", error);
      return jsonError(500, "delete_failed");
    }

    await cleanupPhoto(supabase, service.photo_url);
    revalidateTag("services");

    return jsonOk();
  });
}

async function cleanupPhoto(supabase: SupabaseClient, photoUrl: unknown) {
  if (typeof photoUrl !== "string") return;
  const parsed = parseStoredUrl(photoUrl);
  if (!parsed) return;
  try {
    await supabase.storage.from(parsed.bucket).remove([parsed.key]);
  } catch (err) {
    logError("[dashboard.services.delete] storage remove failed", err);
  }
}
