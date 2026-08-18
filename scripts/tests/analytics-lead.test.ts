/**
 * Analytics lead tracking suite.
 * Verifies that contact CTAs emit exactly ONE `lead` event per click plus the
 * specific contact metric, that non-contact events never emit `lead`, and that
 * the payload carries no PII (no visitor_key / no extra fields).
 */

import { run, finish, assert, assertEqual } from "./suite.ts";
import { trackLead, trackInteraction } from "../../lib/analytics/client.ts";

const BUSINESS_ID = "11111111-1111-4111-8111-111111111111";

type Captured = {
  url: string;
  body: { business_id: string; event_type: string; visitor_key?: string };
};

let captured: Captured[] = [];
const originalFetch = globalThis.fetch;

function stubFetch() {
  captured = [];
  (globalThis as { fetch: unknown }).fetch = (
    input: unknown,
    init?: RequestInit,
  ) => {
    captured.push({
      url: String(input),
      body: JSON.parse(String(init?.body ?? "{}")) as Captured["body"],
    });
    return Promise.resolve(new Response(null, { status: 201 }));
  };
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

function eventsOf(type: string): Captured[] {
  return captured.filter((c) => c.body.event_type === type);
}

await run("trackLead: whatsapp emits exactly one lead + one whatsapp_click", () => {
  stubFetch();
  try {
    trackLead(BUSINESS_ID, "whatsapp");
    assertEqual(captured.length, 2, "total events");
    assertEqual(eventsOf("lead").length, 1, "exactly one lead");
    assertEqual(eventsOf("whatsapp_click").length, 1, "exactly one whatsapp_click");
    assertEqual(captured[0].body.event_type, "lead", "lead emitted first");
    assertEqual(captured[1].body.event_type, "whatsapp_click", "specific metric second");
    for (const c of captured) {
      assertEqual(c.url, "/api/analytics/track", "track endpoint");
      assertEqual(c.body.business_id, BUSINESS_ID, "business id carried");
      assert(!("visitor_key" in c.body), "lead payload must not carry a visitor_key (privacy)");
      const keys = Object.keys(c.body);
      assert(
        keys.length === 2 && !keys.includes("visitor_key"),
        `payload carries only business_id + event_type, got ${keys.join(",")}`,
      );
    }
  } finally {
    restoreFetch();
  }
});

await run("trackLead: call emits exactly one lead + one call_click", () => {
  stubFetch();
  try {
    trackLead(BUSINESS_ID, "call");
    assertEqual(captured.length, 2, "total events");
    assertEqual(eventsOf("lead").length, 1, "exactly one lead");
    assertEqual(eventsOf("call_click").length, 1, "exactly one call_click");
  } finally {
    restoreFetch();
  }
});

await run("trackInteraction: photo_view does not create a lead", () => {
  stubFetch();
  try {
    trackInteraction(BUSINESS_ID, "photo_view");
    assertEqual(captured.length, 1, "single event");
    assertEqual(captured[0].body.event_type, "photo_view", "event type");
    assertEqual(eventsOf("lead").length, 0, "no lead from photo_view");
  } finally {
    restoreFetch();
  }
});

await run("trackLead: empty business id is a no-op", () => {
  stubFetch();
  try {
    trackLead("", "whatsapp");
    assertEqual(captured.length, 0, "no events for empty business id");
  } finally {
    restoreFetch();
  }
});

await run("trackLead: repeated clicks still emit exactly one lead each", () => {
  stubFetch();
  try {
    trackLead(BUSINESS_ID, "whatsapp");
    trackLead(BUSINESS_ID, "call");
    assertEqual(eventsOf("lead").length, 2, "one lead per click");
    assertEqual(captured.length, 4, "two events per click");
  } finally {
    restoreFetch();
  }
});

await finish();