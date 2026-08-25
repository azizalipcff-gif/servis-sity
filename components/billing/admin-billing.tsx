"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Plan = {
  id: string;
  plan_key: string;
  interval: string;
  name: string;
  price_cents: number;
  currency: string;
  active: boolean;
};
type Payment = Record<string, unknown> & {
  id: string;
  business_id: string | null;
  business_name: string | null;
  owner_name: string | null;
  user_id: string | null;
  amount_cents: number;
  currency: string;
  provider: string;
  status: string;
  created_at: string;
};
type VerReq = { id: string; business_id: string | null; status: string; created_at: string; admin_note: string | null };
type Featured = { id: string; business_id: string; surface: string | null; status: string; expires_at: string | null };
type Coupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  active: boolean;
  max_usage: number | null;
  expires_at: string | null;
  applies_to: string;
  period: string;
};
type Business = { id: string; name: string; plan: string | null };

type Tab = "plans" | "payments" | "verification" | "featured" | "coupons" | "upgrade";

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
    const map: Record<Exclude<Tab, "upgrade">, string> = {
      plans: "/api/admin/plans",
      payments: "/api/admin/payments",
      verification: "/api/admin/verification",
      featured: "/api/admin/featured",
      coupons: "/api/admin/coupons",
    };
    const res = await fetch(map[which as Exclude<Tab, "upgrade">]);
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
      await Promise.all([
        refresh("plans"),
        refresh("payments"),
        refresh("verification"),
        refresh("featured"),
        refresh("coupons"),
      ]);
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
    if (!res.ok) {
      const out = await res.json().catch(() => ({}));
      return setErr(out.error ?? "error");
    }
    after?.();
  }, []);

  if (load) return <div className="py-16 text-center text-muted-foreground">{tb("processing")}</div>;

  const tabLabel: Record<Tab, string> = {
    plans: ta("plans"),
    payments: ta("payments"),
    verification: ta("verification"),
    featured: ta("featured"),
    coupons: ta("coupons"),
    upgrade: ta("upgradeTab"),
  };

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {err}
        </div>
      )}
      <div className="flex flex-wrap gap-1 rounded-full border bg-card p-1">
        {(
          ["plans", "payments", "verification", "featured", "coupons", "upgrade"] as Tab[]
        ).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tabLabel[k]}
          </button>
        ))}
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
                post(
                  "/api/admin/plans",
                  { plan_key: k, interval: iv, name: nm, price_cents: Math.round(Number(price) * 100) },
                  () => refresh("plans"),
                );
              }}
              className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background"
            >
              {ta("addPlan")}
            </button>
          </div>
          <PlanTable
            plans={plans}
            onToggle={(id, active) => patch("/api/admin/plans", { id, active: !active }).then(() => refresh("plans"))}
            onDelete={(id) => del(`/api/admin/plans?id=${id}`, () => refresh("plans"))}
          />
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
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note"
              className="w-full rounded-xl border bg-background px-4 py-2 text-sm outline-none"
            />
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
          <FeaturedTable
            items={featured}
            onAction={(id, action) => patch("/api/admin/featured", { id, action }).then(() => refresh("featured"))}
          />
        </div>
      )}

      {tab === "coupons" && (
        <div className="rounded-3xl border bg-card p-6">
          <CouponManager
            coupons={coupons}
            onCreated={() => refresh("coupons")}
            onToggle={(id, active) => patch("/api/admin/coupons", { id, active: !active }).then(() => refresh("coupons"))}
          />
        </div>
      )}

      {tab === "upgrade" && (
        <div className="rounded-3xl border bg-card p-6">
          <GrantTab />
        </div>
      )}
    </div>
  );
}

function PlanTable({ plans, onToggle, onDelete }: { plans: Plan[]; onToggle: (id: string, active: boolean) => void; onDelete: (id: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-start text-muted-foreground">
            {["key", "interval", "price", "status", "actions"].map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="px-3 py-2 font-mono text-xs">{p.plan_key}</td>
              <td className="px-3 py-2">{p.interval}</td>
              <td className="px-3 py-2">
                {(p.price_cents / 100).toFixed(0)} {p.currency}
              </td>
              <td className="px-3 py-2">{p.active ? "✓" : "—"}</td>
              <td className="px-3 py-2">
                <button className="me-2 text-primary" onClick={() => onToggle(p.id, p.active)}>
                  {p.active ? "off" : "on"}
                </button>
                <button className="text-destructive" onClick={() => onDelete(p.id)}>
                  x
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentTable({ payments, onConfirm, onRefund }: { payments: Payment[]; onConfirm: (id: string) => void; onRefund: (id: string) => void }) {
  const ta = useTranslations("billing.admin");
  if (payments.length === 0) return <p className="text-sm text-muted-foreground">{ta("noData")}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="text-start text-muted-foreground">
            {[ta("business"), ta("owner"), ta("amount"), ta("currency"), ta("provider"), ta("status"), ta("date"), ta("actions")].map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="px-3 py-2">{p.business_name ?? (p.business_id ? p.business_id.slice(0, 8) : "—")}</td>
              <td className="px-3 py-2">{p.owner_name ?? (p.user_id ? p.user_id.slice(0, 8) : "—")}</td>
              <td className="px-3 py-2" dir="ltr">
                {((p.amount_cents as number) / 100).toFixed(2)}
              </td>
              <td className="px-3 py-2" dir="ltr">
                {p.currency}
              </td>
              <td className="px-3 py-2">{p.provider}</td>
              <td className="px-3 py-2">{p.status}</td>
              <td className="px-3 py-2" dir="ltr">
                {new Date(p.created_at).toLocaleString()}
              </td>
              <td className="px-3 py-2">
                {p.status === "pending" && (
                  <button className="me-2 text-primary" onClick={() => onConfirm(p.id)}>
                    {ta("confirm")}
                  </button>
                )}
                {p.status === "succeeded" && (
                  <button className="text-destructive" onClick={() => onRefund(p.id)}>
                    {ta("refund")}
                  </button>
                )}
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
        <thead>
          <tr className="text-start text-muted-foreground">
            {[ta("status"), ta("actions")].map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="px-3 py-2">{r.status}</td>
              <td className="px-3 py-2">
                <button className="me-2 text-emerald-600" onClick={() => onAction(r.id, "approved")}>
                  {ta("approve")}
                </button>
                <button className="me-2 text-destructive" onClick={() => onAction(r.id, "rejected")}>
                  {ta("reject")}
                </button>
                <button className="text-muted-foreground" onClick={() => onAction(r.id, "request_changes")}>
                  {ta("requestChanges")}
                </button>
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
        <thead>
          <tr className="text-start text-muted-foreground">
            {[ta("business"), ta("status"), ta("actions")].map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((f) => (
            <tr key={f.id} className="border-t">
              <td className="px-3 py-2">{f.business_id}</td>
              <td className="px-3 py-2">{f.status}</td>
              <td className="px-3 py-2">
                {f.status === "pending" && (
                  <button className="me-2 text-emerald-600" onClick={() => onAction(f.id, "approve")}>
                    {ta("approve")}
                  </button>
                )}
                {f.status === "active" && (
                  <button className="me-2 text-primary" onClick={() => onAction(f.id, "renew")}>
                    {ta("renew")}
                  </button>
                )}
                <button className="text-destructive" onClick={() => onAction(f.id, "revoke")}>
                  {ta("deactivate")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CouponManager({
  coupons,
  onCreated,
  onToggle,
}: {
  coupons: Coupon[];
  onCreated: () => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const ta = useTranslations("billing.admin");
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [type, setType] = useState("percent");
  const [value, setValue] = useState("");
  const [maxUsage, setMaxUsage] = useState("");
  const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function create() {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        type,
        value: Number(value || 0),
        applies_to: "any",
        max_usage: maxUsage ? Number(maxUsage) : null,
        expires_at: expires || null,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      setCode("");
      setValue("");
      setMaxUsage("");
      setExpires("");
      onCreated();
    } else {
      const out = await res.json().catch(() => ({}));
      setErr(out.error ?? ta("couponError"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{ta("coupons")}</h2>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background"
        >
          {ta("addCoupon")}
        </button>
      </div>

      {open && (
        <div className="grid gap-3 rounded-2xl border bg-muted/30 p-4 sm:grid-cols-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={ta("code")}
            className="rounded-xl border bg-background px-3 py-2 text-sm outline-none"
          />
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border bg-background px-3 py-2 text-sm">
            <option value="percent">{ta("percent")}</option>
            <option value="fixed">{ta("fixed")}</option>
          </select>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={ta("value")}
            type="number"
            className="rounded-xl border bg-background px-3 py-2 text-sm outline-none"
          />
          <input
            value={maxUsage}
            onChange={(e) => setMaxUsage(e.target.value)}
            placeholder={ta("maxUsage")}
            type="number"
            className="rounded-xl border bg-background px-3 py-2 text-sm outline-none"
          />
          <input
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            placeholder={ta("expires")}
            type="date"
            className="rounded-xl border bg-background px-3 py-2 text-sm outline-none"
          />
          <div className="flex gap-2 sm:col-span-2">
            <button
              disabled={busy || !code || !value}
              onClick={create}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {ta("save")}
            </button>
            <button onClick={() => setOpen(false)} className="rounded-xl border px-4 py-2 text-sm">
              {ta("cancel")}
            </button>
          </div>
          {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-start text-muted-foreground">
              {[ta("code"), ta("discount"), ta("maxUsage"), ta("expires"), ta("status"), ta("actions")].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{c.code}</td>
                <td className="px-3 py-2">
                  {c.type === "percent" ? `${c.value}%` : `${(c.value / 100).toFixed(2)}`}
                </td>
                <td className="px-3 py-2">{c.max_usage ?? "∞"}</td>
                <td className="px-3 py-2" dir="ltr">
                  {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-3 py-2">{c.active ? "✓" : "—"}</td>
                <td className="px-3 py-2">
                  <button className="text-primary" onClick={() => onToggle(c.id, c.active)}>
                    {c.active ? ta("deactivate") : ta("activate")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GrantTab() {
  const ta = useTranslations("billing.admin");
  const tb = useTranslations("billing");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [planId, setPlanId] = useState("");
  const [mode, setMode] = useState<"grant" | "manual_billing">("grant");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [load, setLoad] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/subscriptions");
      const body = await res.json().catch(() => ({}));
      setBusinesses(body.businesses ?? []);
      setPlans(body.plans ?? []);
      setLoad(false);
    })();
  }, []);

  const selectedPlan = plans.find((p) => p.id === planId);

  async function submit() {
    if (!businessId || !selectedPlan) return;
    setBusy(true);
    setMsg(null);
    const body: Record<string, unknown> = {
      business_id: businessId,
      plan_key: selectedPlan.plan_key,
      interval: selectedPlan.interval,
      mode,
    };
    if (mode === "manual_billing") {
      body.amount_cents = Math.round(Number(amount || "0") * 100);
      body.method = method || undefined;
      body.reference = reference || undefined;
    }
    const res = await fetch("/api/admin/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));
    if (res.ok) setMsg({ ok: true, text: ta("grantSuccess") });
    else setMsg({ ok: false, text: out.error ? `${ta("grantError")} (${out.error})` : ta("grantError") });
    setBusy(false);
  }

  if (load) return <div className="py-8 text-center text-muted-foreground">{tb("processing")}</div>;

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-lg font-semibold">{ta("upgradeTab")}</h2>
      <p className="text-sm text-muted-foreground">{ta("grantMode")}</p>

      <label className="block text-sm font-medium">{ta("selectBusiness")}</label>
      <select value={businessId} onChange={(e) => setBusinessId(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2 text-sm">
        <option value="">—</option>
        {businesses.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name} ({b.plan ?? "—"})
          </option>
        ))}
      </select>

      <label className="block text-sm font-medium">{ta("selectPlan")}</label>
      <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2 text-sm">
        <option value="">—</option>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {p.interval} · {(p.price_cents / 100).toFixed(0)} {p.currency}
          </option>
        ))}
      </select>

      <label className="block text-sm font-medium">{ta("mode")}</label>
      <select value={mode} onChange={(e) => setMode(e.target.value as "grant" | "manual_billing")} className="w-full rounded-xl border bg-background px-3 py-2 text-sm">
        <option value="grant">{ta("grantMode")}</option>
        <option value="manual_billing">{ta("manualMode")}</option>
      </select>

      {mode === "manual_billing" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={ta("amount")} type="number" className="rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
          <input value={method} onChange={(e) => setMethod(e.target.value)} placeholder={ta("method")} className="rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={ta("reference")} className="rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
        </div>
      )}

      <button
        disabled={busy || !businessId || !selectedPlan || (mode === "manual_billing" && !amount)}
        onClick={submit}
        className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {ta("confirmGrant")}
      </button>

      {msg && (
        <div className={`rounded-xl border px-4 py-2 text-sm ${msg.ok ? "border-emerald-400/40 bg-emerald-500/5 text-emerald-600" : "border-destructive/40 bg-destructive/5 text-destructive"}`}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
