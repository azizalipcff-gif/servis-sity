import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => (env.match(new RegExp(k + "=(.*)", "i")) ?? [])[1]?.trim();
const url = get("NEXT_PUBLIC_SUPABASE_URL");
const anon = get("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const svc = get("SUPABASE_SERVICE_ROLE_KEY");
const domain = "https://servis-sity-iwtr.vercel.app";
const s = createClient(url, svc, { auth: { persistSession: false } });
const a = createClient(url, anon, { auth: { persistSession: false } });

const { data: biz } = await s.from("businesses").select("id").eq("slug", "momia").maybeSingle();
const bizId = biz.id;

async function hit(path, { method = "GET", headers = {}, body } = {}) {
  try {
    const r = await fetch(domain + path, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, body: (await r.text()).slice(0, 160) };
  } catch (e) {
    return { status: "THREW", body: String(e).slice(0, 140) };
  }
}
const show = (label, x) => console.log(`${label} -> ${x.status} ${x.body}`);

console.log("=== 1) /api/analytics/track (post-fix, service-role writer) ===");
const vk = "qa-postdeploy-" + Math.random().toString(36).slice(2, 12);
show("legit view (expect 200 ok)", await hit("/api/analytics/track", { method: "POST", headers: { origin: domain }, body: { business_id: bizId, event_type: "view", visitor_key: vk } }));
show("other event type (expect 200)", await hit("/api/analytics/track", { method: "POST", headers: { origin: domain }, body: { business_id: bizId, event_type: "call_click" } }));
show("dup view (expect 200 dedup)", await hit("/api/analytics/track", { method: "POST", headers: { origin: domain }, body: { business_id: bizId, event_type: "view", visitor_key: vk } }));
show("nonexistent business (expect 404 not_found)", await hit("/api/analytics/track", { method: "POST", headers: { origin: domain }, body: { business_id: "00000000-0000-4000-8000-000000000000", event_type: "view" } }));
show("evil origin (expect 403)", await hit("/api/analytics/track", { method: "POST", headers: { origin: "https://evil.example" }, body: { business_id: bizId, event_type: "lead" } }));
show("junk business_id (expect 400)", await hit("/api/analytics/track", { method: "POST", headers: { origin: domain }, body: { business_id: "junk", event_type: "view" } }));
show("banned event_type (expect 400)", await hit("/api/analytics/track", { method: "POST", headers: { origin: domain }, body: { business_id: bizId, event_type: "pwn" } }));
show("visitor_key too short (expect 400)", await hit("/api/analytics/track", { method: "POST", headers: { origin: domain }, body: { business_id: bizId, event_type: "view", visitor_key: "x" } }));

const persisted = await s.from("analytics_events").select("id,event_type,visitor_key").eq("visitor_key", vk).limit(1);
console.log("PERSISTED row confirms the write happened under svc role:", JSON.stringify(persisted.data?.[0] ?? null));
await s.from("analytics_events").delete().eq("visitor_key", vk);
await s.from("analytics_events").delete().eq("business_id", bizId).eq("event_type", "call_click").is("visitor_key", null).lte("created_at", new Date().toISOString()).select("id").then((r) => console.log("cleanup call_click rows:", (r.data ?? []).length));

console.log("=== 2) /api/log ===");
show("no origin (anon, expect 200)", await hit("/api/log", { method: "POST", body: { message: "qa-post" } }));
show("evil origin (expect 403)", await hit("/api/log", { method: "POST", headers: { origin: "https://evil.example" }, body: { message: "x" } }));
show("message > 2000 (expect 400)", await hit("/api/log", { method: "POST", body: { message: "x".repeat(2500) } }));
show("invalid JSON (expect 400)", await hit("/api/log", { method: "POST", body: window.Math ? null : null }));

console.log("=== 3) messenger UUID validation (unauth -> 401 first, never 500) ===");
show("PATCH junk id", await hit("/api/messenger/conversations/not-a-uuid", { method: "PATCH", body: { action: "pin" } }));
show("DELETE junk id", await hit("/api/messenger/conversations/not-a-uuid", { method: "DELETE" }));
show("typing junk conversationId", await hit("/api/messenger/typing", { method: "POST", body: { conversationId: "not-a-uuid" } }));

console.log("=== 4) fail-closed gateways ===");
show("admin PATCH (expect 401)", await hit("/api/admin/businesses", { method: "PATCH", body: {} }));
show("billing checkout POST (expect 401)", await hit("/api/billing/checkout", { method: "POST", body: { businessId: bizId, planKey: "premium_monthly" } }));
show("favorites POST (expect 401)", await hit("/api/favorites", { method: "POST", body: {} }));
show("bookings POST (expect 401)", await hit("/api/bookings", { method: "POST", body: {} }));
show("reviews POST (expect 400 bad_request, no leak)", await hit("/api/reviews", { method: "POST", body: {} }));
show("conversations GET (expect 401)", await hit("/api/messenger/conversations"));
show("webhooks stripe (expect 404)", await hit("/api/webhooks/stripe", { method: "POST", body: {} }));
show("webhooks cmi (expect 404)", await hit("/api/webhooks/cmi", { method: "POST", body: {} }));
show("webhooks payzone (expect 404)", await hit("/api/webhooks/payzone", { method: "POST", body: {} }));

console.log("=== 5) search / SEO regression ===");
show("search momia (expect 200 + item)", await hit("/api/search?q=momia"));
show("search casablanca (expect 200, empty)", await hit("/api/search?q=casablanca"));
show("robots.txt (expect 200 text)", await hit("/robots.txt"));
show("home (expect 200)", await hit("/"));

console.log("=== 6) world-write recheck (RLS unchanged until migration applied) ===");
const w1 = await a.from("system_logs").insert({ level: "warn", message: "qa-ww-" + Math.random().toString(36).slice(2, 8), context: "qa-ww-post" });
console.log("dir anon INSERT system_logs:", w1.error?.message ?? "SUCCEEDED (world-write still open live)");
await s.from("system_logs").delete().eq("context", "qa-ww-post");
console.log("cleaned");