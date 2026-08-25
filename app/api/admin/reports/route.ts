import { requireAdmin } from "@/lib/admin";
import { reportPatchSchema } from "@/lib/validations/admin-schemas";
import { writeAudit } from "@/lib/security/audit";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { notifyUser } from "@/lib/notifications";

export async function PATCH(request: Request) {
  return withErrorCapture("admin.reports.patch", async () => {
    const rl = await rateLimit(request, { key: "admin:mutate", limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const guard = await requireAdmin();
    if (!guard) return jsonError(401, "unauthorized");

    const body = await request.json().catch(() => null);
    const parsed = reportPatchSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");

    const { id, status, action } = parsed.data;

    const { data: report, error: readErr } = await guard.supabase
      .from("reports")
      .select("id, business_id, status")
      .eq("id", id)
      .maybeSingle();
    if (readErr || !report) return jsonError(404, "not_found");

    const metadata: Record<string, unknown> = { status: status ?? report.status };
    let finalStatus: "open" | "reviewed" | "resolved" =
      (status ?? report.status ?? "open") as "open" | "reviewed" | "resolved";

    if (action === "remove_listing" && report.business_id) {
      const { data: biz } = await guard.supabase
        .from("businesses")
        .select("owner_id, name")
        .eq("id", report.business_id)
        .maybeSingle();
      await guard.supabase
        .from("businesses")
        .update({ status: "rejected", status_note: "Removed by admin following a report" })
        .eq("id", report.business_id);
      if (biz?.owner_id) {
        await notifyUser({
          recipientId: biz.owner_id,
          type: "admin",
          title: biz.name ?? "",
          body: "LISTING_REMOVED",
          link: `/dashboard?tab=plan`,
        });
      }
      metadata.action = "remove_listing";
      finalStatus = "resolved";
    }

    if (action === "suspend_owner" && report.business_id) {
      const { data: biz } = await guard.supabase
        .from("businesses")
        .select("owner_id")
        .eq("id", report.business_id)
        .maybeSingle();
      if (biz?.owner_id) {
        await guard.supabase.from("profiles").update({ suspended: true }).eq("id", biz.owner_id);
        await notifyUser({
          recipientId: biz.owner_id,
          type: "admin",
          title: "Account suspended",
          body: "ACCOUNT_SUSPENDED",
          link: "/",
        });
      }
      metadata.action = "suspend_owner";
      finalStatus = "resolved";
    }

    const { error } = await guard.supabase
      .from("reports")
      .update({ status: finalStatus })
      .eq("id", id);
    if (error) return jsonError(500, "update_failed");

    await writeAudit({
      actorId: guard.admin.id,
      action: "report.resolve",
      targetType: "report",
      targetId: id,
      metadata,
    });
    return jsonOk();
  });
}