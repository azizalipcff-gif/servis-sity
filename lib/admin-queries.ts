import { createClient } from "@/lib/supabase/server";
import type { Business, Category, Profile, Report } from "@/lib/supabase/database.types";

export type AdminBusiness = Business & {
  categories: Pick<Category, "slug" | "name_ar" | "name_fr" | "name_en"> | null;
  profiles: Pick<Profile, "full_name"> | null;
};

export type AnalyticsSummary = { total: number; views: number; whatsapp_clicks: number; call_clicks: number; leads: number; photo_views: number; series: { date: string; views: number; leads: number }[] };

export async function getOwnerAnalytics(businessId: string): Promise<AnalyticsSummary> {
  const supabase = await createClient(); const empty: AnalyticsSummary = { total: 0, views: 0, whatsapp_clicks: 0, call_clicks: 0, leads: 0, photo_views: 0, series: [] }; if (!businessId) return empty;
  const { data, error } = await supabase.from("analytics_events").select("event_type, created_at").eq("business_id", businessId); if (error || !data) return empty;
  const counts: Record<string, number> = { view: 0, whatsapp_click: 0, call_click: 0, lead: 0, photo_view: 0 }; for (const e of data) if (e.event_type in counts) counts[e.event_type] += 1;
  const series: AnalyticsSummary["series"] = []; const now = new Date(); for (let i = 13; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); series.push({ date: d.toISOString().slice(0, 10), views: 0, leads: 0 }); }
  const byDay = new Map<string, { views: number; leads: number }>(); for (const e of data) { const key = new Date(e.created_at).toISOString().slice(0, 10); const slot = byDay.get(key) ?? { views: 0, leads: 0 }; if (e.event_type === "view") slot.views += 1; else if (e.event_type === "lead") slot.leads += 1; byDay.set(key, slot); }
  for (const s of series) { const slot = byDay.get(s.date); if (slot) Object.assign(s, slot); }
  return { total: data.length, views: counts.view, whatsapp_clicks: counts.whatsapp_click, call_clicks: counts.call_click, leads: counts.lead, photo_views: counts.photo_view, series };
}

export type AdminDashboardStats = { businesses: number; pendingBusinesses: number; pendingVerification: number; users: number; premiumUsers: number; revenue: number; reports: number; categories: number; cities: number; reviews: number; bookings: number; subscriptions: number };
export async function getAdminDashboard(): Promise<AdminDashboardStats> {
  const supabase = await createClient(); const [businesses, pendingBusinesses, pendingVerification, users, premiumUsers, reports, categories, cities, reviews, bookings, subscriptions] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }), supabase.from("businesses").select("id", { count: "exact", head: true }).eq("status", "pending_review"), supabase.from("verification_requests").select("id", { count: "exact", head: true }).eq("status", "pending"), supabase.from("profiles").select("id", { count: "exact", head: true }), supabase.from("businesses").select("id", { count: "exact", head: true }).neq("plan", "free"), supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"), supabase.from("categories").select("id", { count: "exact", head: true }), supabase.from("cities").select("id", { count: "exact", head: true }), supabase.from("reviews").select("id", { count: "exact", head: true }), supabase.from("bookings").select("id", { count: "exact", head: true }), supabase.from("subscriptions").select("id", { count: "exact", head: true }),
  ]); const n = (r: { count: number | null; error: unknown }) => r.error ? 0 : (r.count ?? 0); return { businesses: n(businesses), pendingBusinesses: n(pendingBusinesses), pendingVerification: n(pendingVerification), users: n(users), premiumUsers: n(premiumUsers), revenue: 0, reports: n(reports), categories: n(categories), cities: n(cities), reviews: n(reviews), bookings: n(bookings), subscriptions: n(subscriptions) };
}

export async function getAdminBusinesses(): Promise<AdminBusiness[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("businesses").select("*, categories!businesses_category_id_fkey(slug, name_ar, name_fr, name_en), profiles!businesses_owner_id_fkey(full_name)").order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as unknown as AdminBusiness[];
}

export type AdminReport = Report & { businesses: { name: string; slug: string; status: string } | null; profiles: { full_name: string | null } | null };
export async function getAdminReports(): Promise<AdminReport[]> { const supabase = await createClient(); const { data, error } = await supabase.from("reports").select("*, businesses(name, slug, status), profiles(full_name)").order("created_at", { ascending: false }).limit(100); if (error || !data) return []; return data as AdminReport[]; }
export type RecentActivity = { id: string; kind: "booking" | "review" | "report" | "signup"; label: string; at: string };
export async function getRecentActivity(limit = 12): Promise<RecentActivity[]> { const supabase = await createClient(); const [bookings, reviews, reports, signups] = await Promise.all([supabase.from("bookings").select("id, client_name, created_at, status").order("created_at", { ascending: false }).limit(limit), supabase.from("reviews").select("id, rating, created_at").order("created_at", { ascending: false }).limit(limit), supabase.from("reports").select("id, reason, created_at").order("created_at", { ascending: false }).limit(limit), supabase.from("profiles").select("id, full_name, created_at").order("created_at", { ascending: false }).limit(limit)]); const list: RecentActivity[] = []; for (const b of bookings.data ?? []) list.push({ id: b.id, kind: "booking", label: `${b.client_name ?? "?"} · ${b.status ?? "pending"}`, at: b.created_at }); for (const r of reviews.data ?? []) list.push({ id: r.id, kind: "review", label: `${r.rating}★ review`, at: r.created_at }); for (const r of reports.data ?? []) list.push({ id: r.id, kind: "report", label: `${r.reason ?? "report"}`, at: r.created_at }); for (const p of signups.data ?? []) list.push({ id: p.id, kind: "signup", label: `${p.full_name ?? "User"} joined`, at: p.created_at }); return list.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit); }
export type AuditEntry = { id: string; actor_id: string | null; action: string; target_type: string; target_id: string | null; metadata: Record<string, unknown> | null; created_at: string; actor_name?: string | null };
export async function getAuditLogs(limit = 100): Promise<AuditEntry[]> { const supabase = await createClient(); const { data, error } = await supabase.from("audit_logs").select("id, actor_id, action, target_type, target_id, metadata, created_at").order("created_at", { ascending: false }).limit(limit); if (error || !data) return []; return data as AuditEntry[]; }
export type HealthReport = { ok: boolean; checks: { key: string; label: string; ok: boolean }[] };
export async function getSystemHealth(): Promise<HealthReport> { const supabase = await createClient(); const probes = await Promise.all([supabase.from("profiles").select("id", { count: "exact", head: true }), supabase.from("businesses").select("id", { count: "exact", head: true }), supabase.from("reviews").select("id", { count: "exact", head: true })]); const checks = probes.map((p, i) => ({ key: ["users", "businesses", "reviews"][i] ?? "db", label: ["profiles", "businesses", "reviews"][i] ?? "db", ok: !p.error })); return { ok: checks.every((c) => c.ok), checks }; }
