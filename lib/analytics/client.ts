import type { AnalyticsEventType } from "@/lib/supabase/database.types";

/**
 * Client-side analytics tracking. Fire-and-forget POST to /api/analytics/track
 * (server validates, rate-limits and dedups). Never throws — analytics must
 * never break the UI.
 *
 * Views are deduped per (business, session): a visitor generates one
 * `visitor_key` per business which is reused across navigation, so reloads
 * inside the same session do not inflate the counter.
 */

const VISITOR_PREFIX = "svc:visitor:";

function visitorKey(businessId: string): string {
  try {
    const existing = sessionStorage.getItem(VISITOR_PREFIX + businessId);
    if (existing) return existing;
  } catch {
    /* no storage */
  }
  const key =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    sessionStorage.setItem(VISITOR_PREFIX + businessId, key);
  } catch {
    /* no storage */
  }
  return key;
}

export function trackEvent(
  businessId: string,
  eventType: AnalyticsEventType,
  opts?: { visitorKey?: boolean | string },
): void {
  if (!businessId) return;
  const body: {
    business_id: string;
    event_type: AnalyticsEventType;
    visitor_key?: string;
  } = { business_id: businessId, event_type: eventType };
  const key = opts?.visitorKey;
  if (key === true) body.visitor_key = visitorKey(businessId);
  else if (typeof key === "string") body.visitor_key = key;

  void fetch("/api/analytics/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {
    /* analytics is best-effort */
  });
}

/** Record one business page view per session. */
export function trackBusinessView(businessId: string): void {
  trackEvent(businessId, "view", { visitorKey: true });
}

/** Record an interaction click (call / WhatsApp / photo / lead). */
export function trackInteraction(
  businessId: string,
  eventType: Extract<
    AnalyticsEventType,
    "whatsapp_click" | "call_click" | "photo_view" | "lead"
  >,
): void {
  trackEvent(businessId, eventType);
}

/**
 * Record a contact lead. Emits exactly ONE `lead` event per contact click
 * alongside the specific contact metric (whatsapp_click / call_click), which
 * stay as separately counted event types. Called only from real contact CTAs;
 * the payload carries no PII (business_id + event_type only, no visitor_key).
 */
export function trackLead(
  businessId: string,
  kind: "whatsapp" | "call",
): void {
  if (!businessId) return;
  trackEvent(businessId, "lead");
  trackEvent(businessId, kind === "whatsapp" ? "whatsapp_click" : "call_click");
}