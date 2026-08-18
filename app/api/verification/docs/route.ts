import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { uuidSchema } from "@/lib/validations/schemas";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import {
  VERIFICATION_FIELD_COLUMNS,
  parseVerificationPath,
} from "@/lib/verification/docs";

export const dynamic = "force-dynamic";

const DOC_COLUMNS = Object.values(VERIFICATION_FIELD_COLUMNS);

/**
 * Signed URLs for the verification documents of the signed-in owner's own
 * business. The bucket is private, so the raw stored paths are useless in a
 * browser without a short-lived signed URL. Only the owner (or an admin, via
 * the admin surface) can mint them, and they expire after an hour.
 */
export async function GET(req: NextRequest) {
  return withErrorCapture("verification.docs.get", async () => {
    const raw = req.nextUrl.searchParams.get("business_id");
    if (!uuidSchema.safeParse(raw).success) return jsonError(400, "bad_request");

    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", raw as string)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!business) return jsonError(403, "forbidden");

    const { data } = await supabase
      .from("verification_requests")
      .select("id,status,admin_note,notes,created_at,reviewed_at")
      .eq("business_id", raw as string)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const request = data as Record<string, unknown> | null;
    if (!request) return jsonOk({ request: null, docs: {} });

    // Always hydrate the stored doc columns into the returned row so the UI
    // does not need a second read.
    const hydrated = { ...request };
    for (const column of DOC_COLUMNS) {
      if (!(column in hydrated)) hydrated[column] = null;
    }

    const docs: Record<
      string,
      { url: string | null; key: string | null; path: string | null }
    > = {};
    for (const column of DOC_COLUMNS) {
      const value = hydrated[column];
      if (typeof value !== "string" || !value) continue;
      const parsed = parseVerificationPath(value);
      if (!parsed) {
        docs[column] = { url: value, key: null, path: null };
        continue;
      }
      const { data: signed } = await supabase.storage
        .from(parsed.bucket)
        .createSignedUrl(parsed.key, 3600);
      docs[column] = { url: signed?.signedUrl ?? null, key: parsed.key, path: value };
    }

    return jsonOk({ request: hydrated, docs });
  });
}