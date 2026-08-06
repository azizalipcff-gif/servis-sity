import { createClient } from "@/lib/supabase/server";
import { bookingSchema } from "@/lib/validations/schemas";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

export async function POST(request: Request) {
  return withErrorCapture("bookings.post", async () => {
    const rl = rateLimit(request, { key: "booking:create", limit: 20, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const body = await request.json().catch(() => null);
    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");

    const supabase = await createClient();
    const { error } = await supabase.from("bookings").insert({
      business_id: parsed.data.business_id,
      service_id: parsed.data.service_id ?? null,
      client_name: parsed.data.client_name,
      client_phone: parsed.data.client_phone,
      booking_date: parsed.data.booking_date,
      booking_time: parsed.data.booking_time,
      status: "pending",
    });

    if (error) return jsonError(500, "insert_failed");
    return jsonOk();
  });
}