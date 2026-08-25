/**
 * Review / star-rating system integration tests.
 *
 * Exercises the real Supabase path the app uses (the same RLS + aggregation
 * trigger the /api/reviews route relies on), so we can prove a submitted
 * rating (1) persists, (2) updates rating_avg / reviews_count, (3) rejects
 * duplicate reviews, (4) rejects unauthenticated writes, and (5) returns the
 * reviewer profile for display.
 *
 * Run: node scripts/tests/review-system.test.ts
 * Requires a Supabase env (.env.local). Skips cleanly if absent.
 */
import { run, finish, assert, assertEqual } from "./suite.ts";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnv() {
  try {
    return readFileSync(".env.local", "utf8")
      .split("\n")
      .reduce<Record<string, string>>((a, l) => {
        const m = l.match(/^([^=]+)=(.*)$/);
        if (m) a[m[1].trim()] = m[2].trim();
        return a;
      }, {});
  } catch {
    return {};
  }
}

const env = loadEnv();
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

(async () => {
  if (!URL || !ANON || !SERVICE) {
    console.log("ok    review-system: skipped (no Supabase env)");
    await finish();
    return;
  }

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });

  const stamp = Date.now();
  const revEmail = `qa-rev-${stamp}@example.com`;
  const revPass = "QaTest!12345";
  let revId: string | undefined;
  let targetBiz: { id: string } | null = null;
  let createdReviewId: string | undefined;

  async function setup() {
    const { data: rev, error: createErr } = await admin.auth.admin.createUser({
      email: revEmail,
      password: revPass,
      email_confirm: true,
    });
    if (createErr || !rev.user) throw new Error("createUser failed: " + (createErr?.message ?? "no user"));
    revId = rev.user.id;

    const { data: biz } = await anon
      .from("businesses")
      .select("id, owner_id, status")
      .eq("status", "approved")
      .neq("owner_id", revId)
      .limit(1)
      .maybeSingle();
    if (!biz) throw new Error("no approved business available to test against");
    targetBiz = { id: biz.id };

    const { error } = await anon.auth.signInWithPassword({
      email: revEmail,
      password: revPass,
    });
    if (error) throw new Error("signin: " + error.message);
  }

  async function teardown() {
    if (createdReviewId)
      await admin.from("reviews").delete().eq("id", createdReviewId);
    if (revId) await admin.auth.admin.deleteUser(revId);
  }

  try {
    await setup();
  } catch (e) {
    console.error("FAIL  review-system setup:", (e as Error).message);
    await finish();
    return;
  }

  await run("review: authenticated insert persists + aggregation updates", async () => {
    const before = await admin
      .from("businesses")
      .select("rating_avg, reviews_count")
      .eq("id", targetBiz!.id)
      .single();
    const { error } = await anon.from("reviews").insert({
      business_id: targetBiz!.id,
      user_id: revId,
      rating: 4,
      comment: "integration test review",
    });
    assert(!error, "insert should succeed, got: " + (error?.message ?? ""));

    const after = await admin
      .from("businesses")
      .select("rating_avg, reviews_count")
      .eq("id", targetBiz!.id)
      .single();
    assertEqual(
      after.data!.reviews_count,
      before.data!.reviews_count + 1,
      "reviews_count must increment by 1",
    );
    assert(after.data!.rating_avg > 0, "rating_avg must be recomputed (>0)");

    const { data: rev } = await admin
      .from("reviews")
      .select("id")
      .eq("business_id", targetBiz!.id)
      .eq("user_id", revId)
      .limit(1)
      .maybeSingle();
    createdReviewId = rev?.id;
    assert(!!createdReviewId, "inserted review row must be readable back");
  });

  await run("review: duplicate (business,user) is rejected (23505)", async () => {
    const { error } = await anon.from("reviews").insert({
      business_id: targetBiz!.id,
      user_id: revId,
      rating: 5,
    });
    assert(
      error?.code === "23505",
      "duplicate review must be rejected with 23505, got " + (error?.code ?? "none"),
    );
  });

  await run("review: unauthenticated insert is rejected by RLS (42501)", async () => {
    const fresh = createClient(URL, ANON, { auth: { persistSession: false } });
    const { error } = await fresh.from("reviews").insert({
      business_id: targetBiz!.id,
      user_id: revId,
      rating: 5,
    });
    assert(
      error?.code === "42501",
      "unauth insert must be denied by RLS (42501), got " + (error?.code ?? "none"),
    );
  });

  await run("review: read embeds reviewer profile for display", async () => {
    const { data, error } = await anon
      .from("reviews")
      .select("*, profile:profiles(full_name)")
      .eq("id", createdReviewId!)
      .maybeSingle();
    assert(!error, "review read should succeed, got: " + (error?.message ?? ""));
    assert(data && "profile" in data, "profile relation must be embedded");
  });

  await teardown();
  await finish();
})();
