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

    // Integrity: the booked service must actually belong to the business the
    // booking targets — otherwise a caller could attach another business's
    // service to a booking slot at this business (cross-tenant confusion).
    if (parsed.data.service_id) {
      const { data: service } = await supabase
        .from("services")
        .select("business_id")
        .eq("id", parsed.data.service_id)
        .maybeSingle();
      if (!service || service.business_id !== parsed.data.business_id) {
        return jsonError(400, "bad_request");
      }
    }

    const { error } = await supabase.from("bookings").insert({
      business_id: parsed.data.business_id,
      service_id: parsed.data.service_id ?? null,
      client_name: parsed.data.client_name,
      client_phone: parsed.data.client_phone,
      booking_date: parsed.data.booking_date,
      booking_time: parsed.data.booking_time,
      status: "pending",
    });

    if (error) {
      // The partial unique index (business_id, booking_date, booking_time,
      // client_phone) WHERE status IN ('pending','confirmed','accepted') rejects
      // a double-submit of the same client/slot as 23505. Surface as a graceful
      // conflict rather than a generic 500.
      if ((error as { code?: string }).code === "23505") {
        return jsonError(409, "booking_duplicate");
      }
      return jsonError(500, "insert_failed");
    }

    // Record a booking_created analytics event (best-effort — the booking
    // already succeeded, RLS allows public inserts).
    try {
      await supabase
        .from("analytics_events")
        .insert({
          business_id: parsed.data.business_id,
          event_type: "booking_created",
        } as never);
    } catch {
      // best-effort
    }

    return jsonOk();
  });
}