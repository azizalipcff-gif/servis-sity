import { z } from "zod";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

const logSchema = z.object({
  context: z.string().max(120).optional(),
  message: z.string().max(2000),
  digest: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  return withErrorCapture("log.post", async () => {
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");
    const rl = rateLimit(request, { key: "log:report", limit: 60, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);

    const body = await request.json().catch(() => null);
    const parsed = logSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");

    // Non-fatal, centralized persistence. Client crash reports only store a
    // sanitized message + digest, never internal stack traces. Written via the
    // server-only client because `system_logs` carries no anon write policy
    // (migration 0032 drops the world-writable `system_logs_insert_any`).
    try {
      const { createServiceClient } = await import("@/lib/supabase/server");
      const supabase = createServiceClient();
      if (!supabase) return jsonError(500, "service_role_unconfigured");
      await supabase.from("system_logs").insert({
        context: parsed.data.context ?? "client",
        level: "error",
        message: parsed.data.message.slice(0, 2000),
        stack: parsed.data.digest ? `digest: ${parsed.data.digest}` : null,
        meta: null,
      });
    } catch {
      // ignore persistence failures
    }

    return jsonOk();
  });
}