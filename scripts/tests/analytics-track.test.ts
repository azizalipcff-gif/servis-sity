/**
 * TS-track — analytics tracking regression tests.
 * Locks in the production fix for analytics_events ingestion: the event insert
 * must go through the injected (server-only) client, gate on APPROVED
 * businesses only, treat the view-dedup 23505 as idempotent success, and never
 * require an anon RLS INSERT grant (migration 0032 removed it).
 *
 * Run: node scripts/tests/analytics-track.test.ts
 */

import { run, finish, assertEqual, assert } from "./suite.ts";
import { recordTrackEvent, type TrackEventInput } from "../../lib/analytics/track-service.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

type InsertDecision = { error?: { code?: string } | null };

type FC = Record<string, unknown> & { _inserts: ({ table: string; body: unknown })[] };
function fakeClient(opts: { approved?: boolean } = {}, insert: () => InsertDecision = () => ({})) {
  const c = {
    _inserts: [] as ({ table: string; body: unknown })[],
  } as FC;
  c.from = (table: string) => {
    if (table === "businesses") {
      const maybeSingle = async () => ({ data: opts.approved ? { id: "biz-1" } : null });
      return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle }) }) }) };
    }
    if (table === "analytics_events") {
      return {
        insert: async (body: unknown) => {
          c._inserts.push({ table, body });
          return insert();
        },
      };
    }
    throw new Error("unexpected table " + table);
  };
  return c as unknown as SupabaseClient;
}

const input: TrackEventInput = { business_id: "biz-1", event_type: "view", visitor_key: "v-1234567" };

await run("TS-track: null client (no service key) -> unconfigured", async () => {
  assertEqual(await recordTrackEvent(null, input), "unconfigured");
});

await run("TS-track: unapproved/nonexistent business -> not_found, no insert", async () => {
  const c = fakeClient({ approved: false });
  const res = await recordTrackEvent(c, input);
  assertEqual(res, "not_found");
  assertEqual((c as unknown as { _inserts: unknown[] })._inserts.length, 0, "insert must not run");
});

await run("TS-track: approved business + ok -> inserted, visitor_key defaulted", async () => {
  const c = fakeClient({ approved: true });
  const res = await recordTrackEvent(c, { business_id: "biz-1", event_type: "view" });
  assertEqual(res, "inserted");
  const writes = (c as unknown as { _inserts: { table: string; body: Record<string, unknown> }[] })._inserts;
  assertEqual(writes.length, 1);
  assertEqual(writes[0].table, "analytics_events");
  assert(writes[0].body.visitor_key === null, "visitor_key must be null when absent");
});

await run("TS-track: view dedup (23505) -> deduplicated (idempotent success)", async () => {
  const c = fakeClient({ approved: true }, () => ({ error: { code: "23505" } }));
  assertEqual(await recordTrackEvent(c, input), "deduplicated");
});

await run("TS-track: any other insert failure -> insert_failed", async () => {
  const c = fakeClient({ approved: true }, () => ({ error: { code: "42501", message: "blocked" } }));
  assertEqual(await recordTrackEvent(c, input), "insert_failed");
  const c2 = fakeClient({ approved: true }, () => ({ error: { code: "55000" } }));
  assertEqual(await recordTrackEvent(c2, input), "insert_failed");
});

await finish();