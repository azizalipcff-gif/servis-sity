import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { notifyUser } from "@/lib/notifications";

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
    return jsonOk({ requests: data ?? [] });
  });
}

export async function PATCH(req: NextRequest) {
  return withErrorCapture("admin.verification.patch", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const auth = await requireAdmin();
    if (!auth) return jsonError(403, "forbidden");

    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      status?: "approved" | "rejected" | "request_changes";
      note?: string;
    };
    if (!body.id || !body.status) return jsonError(400, "bad_request");

    const { data: row } = (await auth.supabase
      .from("verification_requests")
      .select("id,business_id,status,admin_note")
      .eq("id", body.id)
      .single()) as { data: ReqRow | null; error: unknown };

    const status =
      body.status === "approved"
        ? "verified"
        : body.status === "rejected"
          ? "rejected"
          : "pending";

    await auth.supabase
      .from("verification_requests")
      .update({
        status,
        admin_note: body.note ?? null,
        reviewed_at: new Date().toISOString(),
      } as never)
      .eq("id", body.id);

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
        body: body.note ?? "",
        link: "/billing",
      });
    }

    return jsonOk({ ok: true, status });
  });
}