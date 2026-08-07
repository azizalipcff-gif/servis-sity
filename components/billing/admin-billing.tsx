"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Plan = { id: string; plan_key: string; interval: string; name: string; price_cents: number; currency: string; active: boolean };
type Payment = { id: string; business_id: string | null; amount_cents: number; currency: string; provider: string; status: string; created_at: string };
type VerReq = { id: string; business_id: string | null; status: string; created_at: string; admin_note: string | null };
type Featured = { id: string; business_id: string; surface: string | null; status: string; expires_at: string | null };
type Coupon = { id: string; code: string; type: string; value: number; active: boolean };

type Tab = "plans" | "payments" | "verification" | "featured" | "coupons";

export function AdminBilling() {
  const tb = useTranslations("billing");
  const ta = useTranslations("billing.admin");
  const [tab, setTab] = useState<Tab>("plans");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [verReqs, setVerReqs] = useState<VerReq[]>([]);
  const [featured, setFeatured] = useState<Featured[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [load, setLoad] = useState(true);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  const refresh = useCallback(async (which: Tab) => {
    setErr("");
    const map: Record<Tab, string> = {
      plans: "/api/admin/plans",
      payments: "/api/admin/payments",
      verification: "/api/admin/verification",
      featured: "/api/admin/featured",
      coupons: "/api/admin/coupons",
    };
    const res = await fetch(map[which]);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setErr(body.error ?? "error");
    if (which === "plans") setPlans(body.plans ?? []);
    if (which === "payments") setPayments(body.payments ?? []);
    if (which === "verification") setVerReqs(body.requests ?? []);
    if (which === "featured") setFeatured(body.items ?? []);
    if (which === "coupons") setCoupons(body.coupons ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([refresh("plans"), refresh("payments"), refresh("verification"), refresh("featured"), refresh("coupons")]);
      setLoad(false);
    })();
  }, [refresh]);

  const post = useCallback(async (url: string, body: object, after: () => void) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return setErr(out.error ?? "error");
    after();
  }, []);

  const patch = useCallback(async (url: string, body: object) => {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return setErr(out.error ?? "error");
  }, []);

  const del = useCallback(async (url: string, after?: () => void) => {
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) { const out = await res.json().catch(() => ({})); return setErr(out.error ?? "error"); }
    after?.();
  }, []);

  if (load) return <div className="py-16 text-center text-muted-foreground">{tb("processing")}</div>;

  const tabBtn = (key: Tab, label: string) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      className={`rounded-full px-4 py-2 text-sm font-medium ${tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
    >
      {label}
    </button>
  );

  const tabLabel: Record<Tab, string> = {
    plans: ta("plans"),
    payments: ta("payments"),
    verification: ta("verification"),
    featured: ta("featured"),
    coupons: ta("coupons"),
  };

  return (
    <div className="space-y-6">
      {err && <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">{err}</div>}
      <div className="flex flex-wrap gap-1 rounded-full border bg-card p-1">
        {(["plans", "payments", "verification", "featured", "coupons"] as Tab[]).map((k) => tabBtn(k, tabLabel[k]))}
      </div>

      {tab === "plans" && (
        <div className="rounded-3xl border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{ta("plans")}</h2>
            <button
              onClick={() => {
                const p = prompt(ta("addPlan") + " (key|interval|name|price MAD)");
                if (!p) return;
                const [k, iv, nm, price] = p.split("|").map((s) => s.trim());
                if (!k || !iv || !nm || !price) return;
                post("/api/admin/plans", { plan_key: k, interval: iv, name: nm, price_cents: Math.round(Number(price) * 100) }, () => refresh("plans"));
              }}
              className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background"
            >
              {ta("addPlan")}
            </button>
          </div>
          <PlanTable plans={plans} onToggle={(id, active) => patch("/api/admin/plans", { id, active: !active }).then(() => refresh("plans"))} onDelete={(id) => del(`/api/admin/plans?id=${id}`, () => refresh("plans"))} />
        </div>
      )}

      {tab === "payments" && (
        <div className="rounded-3xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">{ta("payments")}</h2>
          <PaymentTable
            payments={payments}
            onConfirm={(id) => patch("/api/admin/payments", { id, action: "confirm" }).then(() => refresh("payments"))}
            onRefund={(id) => patch("/api/admin/payments", { id, action: "refund" }).then(() => refresh("payments"))}
          />
        </div>
      )}

      {tab === "verification" && (
        <div className="rounded-3xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">{ta("subscriptions")}</h2>
          <div className="mb-3">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" className="w-full rounded-xl border bg-background px-4 py-2 text-sm outline-none" />
          </div>
          <VerTable
            items={verReqs}
            onAction={(id, status) => patch("/api/admin/verification", { id, status, note }).then(() => refresh("verification"))}
          />
        </div>
      )}

      {tab === "featured" && (
        <div className="rounded-3xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">{ta("featured")}</h2>
          <FeaturedTable items={featured} onAction={(id, action) => patch("/api/admin/featured", { id, action }).then(() => refresh("featured"))} />
        </div>
      )}

      {tab === "coupons" && (
        <div className="rounded-3xl border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{ta("coupons")}</h2>
            <button
              onClick={() => {
                const p = prompt(`${ta("addCoupon")} (code:type:value) e.g. WELCOME:percent:10`);
                if (!p) return;
                const [code, type, value] = p.split(":").map((s) => s.trim());
                if (!code || !type) return;
                post("/api/admin/coupons", { code, type, value: Number(value ?? 0) }, () => refresh("coupons"));
              }}
              className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background"
            >
              {ta("addCoupon")}
            </button>
          </div>
          <CouponTable coupons={coupons} onToggle={(id, active) => patch("/api/admin/coupons", { id, active: !active }).then(() => refresh("coupons"))} />
        </div>
      )}
    </div>
  );
}

function PlanTable({ plans, onToggle, onDelete }: { plans: Plan[]; onToggle: (id: string, active: boolean) => void; onDelete: (id: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-muted-foreground">{["key", "interval", "price", "status", "actions"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="px-3 py-2 font-mono text-xs">{p.plan_key}</td>
              <td className="px-3 py-2">{p.interval}</td>
              <td className="px-3 py-2">{(p.price_cents / 100).toFixed(0)} {p.currency}</td>
              <td className="px-3 py-2">{p.active ? "✓" : "—"}</td>
              <td className="px-3 py-2">
                <button className="me-2 text-primary" onClick={() => onToggle(p.id, p.active)}>{p.active ? "off" : "on"}</button>
                <button className="text-destructive" onClick={() => onDelete(p.id)}>x</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentTable({ payments, onConfirm, onRefund }: { payments: Payment[]; onConfirm: (id: string) => void; onRefund: (id: string) => void }) {
  if (payments.length === 0) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-muted-foreground">{["amount", "provider", "status", "actions"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="px-3 py-2">{(p.amount_cents / 100).toFixed(2)} {p.currency}</td>
              <td className="px-3 py-2">{p.provider}</td>
              <td className="px-3 py-2">{p.status}</td>
              <td className="px-3 py-2">
                {p.status === "pending" && <button className="me-2 text-primary" onClick={() => onConfirm(p.id)}>confirm</button>}
                {p.status === "succeeded" && <button className="text-destructive" onClick={() => onRefund(p.id)}>refund</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VerTable({ items, onAction }: { items: VerReq[]; onAction: (id: string, status: string) => void }) {
  const ta = useTranslations("billing.admin");
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{ta("noData")}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-muted-foreground">{["status", "actions"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="px-3 py-2">{r.status}</td>
              <td className="px-3 py-2">
                <button className="me-2 text-emerald-600" onClick={() => onAction(r.id, "approved")}>approve</button>
                <button className="me-2 text-destructive" onClick={() => onAction(r.id, "rejected")}>reject</button>
                <button className="text-muted-foreground" onClick={() => onAction(r.id, "request_changes")}>edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeaturedTable({ items, onAction }: { items: Featured[]; onAction: (id: string, action: string) => void }) {
  const ta = useTranslations("billing.admin");
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{ta("noData")}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-muted-foreground">{["surface", "status", "actions"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
        <tbody>
          {items.map((f) => (
            <tr key={f.id} className="border-t">
              <td className="px-3 py-2">{f.surface}</td>
              <td className="px-3 py-2">{f.status}</td>
              <td className="px-3 py-2">
                {f.status === "pending" && <button className="me-2 text-emerald-600" onClick={() => onAction(f.id, "approve")}>approve</button>}
                {f.status === "active" && <button className="me-2 text-primary" onClick={() => onAction(f.id, "renew")}>renew</button>}
                <button className="text-destructive" onClick={() => onAction(f.id, "revoke")}>revoke</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CouponTable({ coupons, onToggle }: { coupons: Coupon[]; onToggle: (id: string, active: boolean) => void }) {
  const ta = useTranslations("billing.admin");
  if (coupons.length === 0) return <p className="text-sm text-muted-foreground">{ta("noData")}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-muted-foreground">{["code", "type", "value", "status", "actions"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
        <tbody>
          {coupons.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="px-3 py-2 font-mono text-xs">{c.code}</td>
              <td className="px-3 py-2">{c.type}</td>
              <td className="px-3 py-2">{c.value}</td>
              <td className="px-3 py-2">{c.active ? "✓" : "—"}</td>
              <td className="px-3 py-2"><button className="text-primary" onClick={() => onToggle(c.id, c.active)}>{c.active ? "off" : "on"}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}