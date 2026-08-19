import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { recordTrackEvent } from "@/lib/analytics/track-service";

export const dynamic = "force-dynamic";

const trackSchema = z.object({
  business_id: z.string().uuid(),
  event_type: z.enum([
    "view",
    "whatsapp_click",
    "call_click",
    "lead",
    "photo_view",
    "booking_created",
  ]),
  visitor_key: z.string().trim().min(8, "minLength").max(80, "maxLength").optional(),
});

/**
 * Public analytics ingestion. Fire-and-forget POST from the browser.
 *
 * - Server-side zod validation (never trust the client).
 * - Per-IP rate limiting so one visitor can't flood the event stream.
 * - Views with a `visitor_key` are de-duplicated by the partial unique index
 *   (`analytics_events_view_dedup_key`); a dup insert is a graceful no-op.
 * - Authorization for a public counter lives HERE (approved business + bounded
 *   enum payload), not in an RLS with-check: migration 0032 removes the
 *   world-writable `analytics_insert_public` policy, so event rows are written
 *   with the server-only client. Direct anon INSERTs stay blocked at the DB.
 */
export async function POST(req: NextRequest) {
  return withErrorCapture("analytics.track", async () => {
    const rl = rateLimit(req, { key: "analytics:track", limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");

    const body = await req.json().catch(() => null);
    const parsed = trackSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");

    // Prefer the server-only client (RSL-independent, hardened after migration
    // 0032); fall back to the session/anon client when SUPABASE_SERVICE_ROLE_KEY
    // is not configured in this environment yet. In all cases the approved
    // business gate is enforced before any write.
    const supabase = createServiceClient() ?? (await createClient());

    const result = await recordTrackEvent(supabase, {
      business_id: parsed.data.business_id,
      event_type: parsed.data.event_type,
      visitor_key: parsed.data.visitor_key,
    });

    switch (result) {
      case "inserted":
      case "deduplicated":
        return jsonOk();
      case "not_found":
        return jsonError(404, "not_found");
      case "unconfigured":
        return jsonError(500, "service_role_unconfigured");
      default:
        return jsonError(500, "insert_failed");
    }
  });
}