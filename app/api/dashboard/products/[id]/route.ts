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
  return withErrorCapture("dashboard.products.delete", async () => {
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
    // archived product is returned ONLY when the caller owns (or administers)
    // the underlying business. That is the server-side ownership check — the
    // client is never trusted with it.
    const { data: product, error: readError } = await supabase
      .from("products")
      .select("id, status, images")
      .eq("id", id)
      .maybeSingle();
    if (readError) {
      logError("[dashboard.products.delete] select failed", readError);
      return jsonError(500, "delete_failed");
    }
    if (!product) return jsonError(404, "not_found");

    // Owners may only remove items that were rejected (archived). This blocks
    // any attempt to bypass moderation by deleting and recreating a published
    // or pending item.
    if (product.status !== "archived") return jsonError(409, "not_archived");

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      logError("[dashboard.products.delete] delete failed", error);
      return jsonError(500, "delete_failed");
    }

    // Best-effort storage cleanup (orphaned images). Failures are logged but
    // must never make the successful DB deletion appear to fail.
    await cleanupImages(supabase, product.images);
    revalidateTag("products");

    return jsonOk();
  });
}

async function cleanupImages(supabase: SupabaseClient, images: unknown) {
  if (!Array.isArray(images)) return;
  await Promise.all(
    images.map(async (url) => {
      if (typeof url !== "string") return;
      const parsed = parseStoredUrl(url);
      if (!parsed) return;
      try {
        await supabase.storage.from(parsed.bucket).remove([parsed.key]);
      } catch (err) {
        logError("[dashboard.products.delete] storage remove failed", err);
      }
    }),
  );
}
