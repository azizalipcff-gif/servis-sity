import type { SupabaseClient } from "@supabase/supabase-js";

export const analyticsEventTypes = [
  "view",
  "whatsapp_click",
  "call_click",
  "lead",
  "photo_view",
  "booking_created",
] as const;
export type AnalyticsEventType = (typeof analyticsEventTypes)[number];

export type TrackEventInput = {
  business_id: string;
  event_type: AnalyticsEventType;
  visitor_key?: string | null;
};

export type TrackEventResult =
  | "inserted"
  | "deduplicated"
  | "not_found"
  | "unconfigured"
  | "insert_failed";

/**
 * Persist one analytics event.
 *
 * The insert uses the server-only (service-role) client: `analytics_events`
 * carries NO anon/authenticated write policy (migration 0032 removes the
 * world-writable `analytics_insert_public`), so tracking must not depend on
 * row-level grants. Server-side guards — zod enum + uuid, rate limit,
 * same-origin, and the approved-business gate below — are the authorization
 * boundary for a public hit counter, and are strictly stronger than the old
 * `with check (true)` policy ever was.
 *
 * Idempotency homes: view dedup (business_id, visitor_key) returns 23505 on
 * replay, which callers treat as success — identical to the pre-fix behavior.
 */
export async function recordTrackEvent(
  supabase: SupabaseClient | null,
  input: TrackEventInput,
): Promise<TrackEventResult> {
  if (!supabase) return "unconfigured";

  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", input.business_id)
    .eq("status", "approved")
    .maybeSingle();
  // Track events only for live, public businesses.
  if (!existing) return "not_found";

  const { error } = await supabase.from("analytics_events").insert({
    business_id: input.business_id,
    event_type: input.event_type,
    visitor_key: input.visitor_key ?? null,
  } as never);

  if (!error) return "inserted";
  if ((error as { code?: string }).code === "23505") return "deduplicated";
  return "insert_failed";
}