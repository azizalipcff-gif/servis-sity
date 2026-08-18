import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { notifyUser } from "@/lib/notifications";
import { verificationPatchSchema } from "@/lib/validations/admin-schemas";
import {
  VERIFICATION_FIELD_COLUMNS,
  VERIFICATION_BUCKET,
  parseVerificationPath,
} from "@/lib/verification/docs";

export const dynamic = "force-dynamic";

type ReqRow = {
  id: string;
  business_id: string | null;
  status: string;
  admin_note: string | null;
};

export async function GET() {
  return withErrorCapture("admin.verification.get", async () => {
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");
    const { data } = await auth.supabase
      .from("verification_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    // Documents live in a private bucket; mint short-lived signed URLs so the
    // admin review UI can preview/review them without public exposure.
    const requests = await Promise.all(
      (data ?? []).map(async (row) => {
        const docFields = Object.values(VERIFICATION_FIELD_COLUMNS);
        const docs: Record<
          string,
          { url: string | null; key: string | null; path: string | null }
        > = {};
        for (const column of docFields) {
          const value = (row as Record<string, unknown>)[column];
          if (typeof value !== "string" || !value) continue;
          const parsed = parseVerificationPath(value);
          if (!parsed) {
            docs[column] = { url: value, key: null, path: null };
            continue;
          }
          const signed =
            parsed.bucket === VERIFICATION_BUCKET
              ? await auth.supabase.storage
                  .from(parsed.bucket)
                  .createSignedUrl(parsed.key, 3600)
              : null;
          docs[column] = {
            url: signed?.data?.signedUrl ?? null,
            key: parsed.key,
            path: value,
          };
        }
        return { ...row, docs };
      }),
    );
    return jsonOk({ requests });
  });
}

export async function PATCH(req: NextRequest) {
  return withErrorCapture("admin.verification.patch", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");

    const body = await req.json().catch(() => null);
    const parsed = verificationPatchSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");
    const { id, status: requestedStatus, note } = parsed.data;

    const { data: row } = (await auth.supabase
      .from("verification_requests")
      .select("id,business_id,status,admin_note")
      .eq("id", id)
      .single()) as { data: ReqRow | null; error: unknown };

    const status =
      requestedStatus === "approved"
        ? "verified"
        : requestedStatus === "rejected"
          ? "rejected"
          : "pending";

    await auth.supabase
      .from("verification_requests")
      .update({
        status,
        admin_note: note ?? null,
        reviewed_at: new Date().toISOString(),
      } as never)
      .eq("id", id);

    // Reflect on the business + profile verification flag.
    if (row?.business_id && status === "verified") {
      await auth.supabase
        .from("businesses")
        .update({ status: "approved" } as never)
        .eq("id", row.business_id);
    }

    const owner = row?.business_id
      ? await auth.supabase
          .from("businesses")
          .select("owner_id")
          .eq("id", row.business_id)
          .maybeSingle()
      : null;
    if (owner?.data?.owner_id) {
      await notifyUser({
        recipientId: owner.data.owner_id,
        type: "verification",
        title: status === "verified" ? "Business verified" : "Verification update",
        body: note ?? "",
        link: "/dashboard",
      });
    }

    return jsonOk({ ok: true, status });
  });
}