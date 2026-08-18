import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

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
 * - RLS `analytics_insert_public` (check true) lets anon/authenticated roles
 *   insert without any read rights on business data.
 */
export async function POST(req: NextRequest) {
  return withErrorCapture("analytics.track", async () => {
    const rl = rateLimit(req, { key: "analytics:track", limit: 120, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");

    const body = await req.json().catch(() => null);
    const parsed = trackSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");

    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", parsed.data.business_id)
      .eq("status", "approved")
      .maybeSingle();
    // Track events only for live, public businesses.
    if (!existing) return jsonError(404, "not_found");

    const { error } = await supabase.from("analytics_events").insert({
      business_id: parsed.data.business_id,
      event_type: parsed.data.event_type,
      visitor_key: parsed.data.visitor_key ?? null,
    } as never);

    if (error) {
      // View dedup or a concurrent identical insert — treat as success.
      if ((error as { code?: string }).code === "23505") return jsonOk();
      return jsonError(500, "insert_failed");
    }
    return jsonOk();
  });
}