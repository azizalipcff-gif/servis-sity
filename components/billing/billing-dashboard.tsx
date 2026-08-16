"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";

type Sub = {
  id: string;
  plan_key: string | null;
  plan: string | null;
  interval: string | null;
  status: string | null;
  started_at: string | null;
  expires_at: string | null;
  next_billing_at: string | null;
  auto_renew: boolean;
  lifetime: boolean;
  cancel_at: string | null;
  cancelled_at: string | null;
  paused_at: string | null;
};
type Invoice = { id: string; number: string; created_at: string; total_cents: number; currency: string; status: string };
type Payment = { id: string; amount_cents: number; currency: string; status: string; provider: string; created_at: string };
type Featured = { id: string; surface: string | null; status: string; expires_at: string | null; price_cents: number };

type DashboardData = {
  business: { id: string; name: string; plan: string } | null;
  current: Sub | null;
  state: string | null;
  entitled: boolean;
  currentPlan: { name: string } | null;
  invoices: Invoice[];
  payments: Payment[];
  transactions: Array<{ id: string; amount_cents: number; currency: string; status: string; created_at: string }>;
};

export function BillingDashboard() {
  const t = useTranslations("billing");
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [featured, setFeatured] = useState<Featured[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");

  const load = useCallback(async () => {
    const [res, fres] = await Promise.all([
      fetch("/api/billing/subscriptions"),
      fetch("/api/billing/featured"),
    ]);
    const d = await res.json().catch(() => null);
    const f = await fres.json().catch(() => null);
    setData(d);
    setFeatured(f?.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // After returning from an online gateway, poll the verify route until the
  // payment reaches a terminal state, then refresh the dashboard.
  useEffect(() => {
    const paymentId =
      searchParams.get("payment") ??
      (() => {
        try {
          const pending = sessionStorage.getItem("pending_payment");
          sessionStorage.removeItem("pending_payment");
          return pending;
        } catch {
          return null;
        }
      })();

    if (!paymentId) return;
    setPaymentNotice(t("paymentStatus.checking"));

    let attempts = 0;
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const res = await fetch("/api/billing/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId }),
        });
        const body = await res.json().catch(() => ({}));
        const status = body.status as string | undefined;
        if (status === "succeeded" || status === "failed" || status === "cancelled") {
          setPaymentNotice(t(`paymentStatus.${status}`));
          await load();
          return;
        }
        if (status === "pending") {
          setPaymentNotice(t("paymentStatus.pending"));
          return;
        }
      } catch {
        // transient network error; keep polling below
      }
      if (attempts < 10) {
        setTimeout(poll, 3000);
      } else {
        setPaymentNotice(t("paymentStatus.unknown"));
      }
    };
    poll();

    return () => {
      cancelled = true;
    };
  }, [searchParams, t, load]);

  const act = useCallback(
    async (action: "cancel" | "pause" | "resume") => {
      setMsg("");
      const res = await fetch("/api/billing/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: data?.business?.id, action }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setMsg(body.error ?? "error");
      await load();
      setMsg(t("updated"));
    },
    [data, t, load],
  );

  const purchaseFeatured = useCallback(async () => {
    if (!data?.business?.id) return;
    const res = await fetch("/api/billing/featured", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: data.business.id, surface: "search" }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      await load();
      setMsg(t("featured.orderCreated"));
    } else {
      setMsg(body.error ?? "error");
    }
  }, [data, t, load]);

  if (loading) return <div className="py-16 text-center text-muted-foreground">{t("processing")}</div>;

  const cur = data?.current;
  const state = data?.state ?? (cur ? "active" : "none");
  const hasPlan = state === "active" || state === "cancelling" || state === "trialing" || state === "paused";
  const planName = cur?.plan_key ?? cur?.plan ?? data?.business?.plan ?? "free";

  return (
    <div className="space-y-8">
      {paymentNotice && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-2 text-sm">{paymentNotice}</div>
      )}
      {msg && <div className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-2 text-sm">{msg}</div>}

      <section className="rounded-3xl border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{t("currentPlan")}</h2>
            <p className="mt-1 text-2xl font-bold capitalize">{planName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {state === "none" || state === "free"
                ? t("noPlan")
                : cur?.lifetime
                  ? t("lifetime")
                  : cur?.next_billing_at || cur?.expires_at
                    ? t("expiresAt", { date: formatDate(cur.next_billing_at ?? cur.expires_at!) })
                    : t(`status_${state}`)}
            </p>
            {cur?.interval && state !== "none" && state !== "free" && (
              <p className="mt-1 text-sm text-muted-foreground">
                {t("interval")} · {cur.interval}
              </p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              {state === "none" || state === "free" ? t("noPlan") : t(`status_${state}`)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/pricing" className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background">
              {t("upgrade")}
            </Link>
            {hasPlan && state === "active" && cur?.auto_renew && (
              <button onClick={() => act("cancel")} className="rounded-xl border px-4 py-2 text-sm">
                {t("cancel")}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-6">
        <h2 className="text-lg font-semibold">{t("invoices.title")}</h2>
        {data?.invoices && data.invoices.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-start text-muted-foreground">
                  <th className="px-3 py-2 font-medium">{t("invoices.number")}</th>
                  <th className="px-3 py-2 font-medium">{t("invoices.date")}</th>
                  <th className="px-3 py-2 font-medium">{t("invoices.amount")}</th>
                  <th className="px-3 py-2 font-medium">{t("invoices.status")}</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((inv) => (
                  <tr key={inv.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">{inv.number}</td>
                    <td className="px-3 py-2">{formatDate(inv.created_at)}</td>
                    <td className="px-3 py-2">{(inv.total_cents / 100).toFixed(2)} {inv.currency}</td>
                    <td className="px-3 py-2 capitalize">{t(`invoices.status_${inv.status}`) ?? inv.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">{t("invoices.empty")}</p>
        )}
      </section>

      <section className="rounded-3xl border bg-card p-6">
        <h2 className="text-lg font-semibold">{t("history.title")}</h2>
        {data?.payments && data.payments.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-start text-muted-foreground">
                  <th className="px-3 py-2 font-medium">{t("history.date")}</th>
                  <th className="px-3 py-2 font-medium">{t("history.amount")}</th>
                  <th className="px-3 py-2 font-medium">{t("history.status")}</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2">{formatDate(p.created_at)}</td>
                    <td className="px-3 py-2">{(p.amount_cents / 100).toFixed(2)} {p.currency}</td>
                    <td className="px-3 py-2 capitalize">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">{t("history.empty")}</p>
        )}
      </section>

      <section className="rounded-3xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("featured.title")}</h2>
          <button onClick={purchaseFeatured} className="rounded-xl bg-muted px-4 py-2 text-sm font-semibold hover:bg-muted/70">
            {t("featured.pay")}
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("featured.intro")}</p>
        {featured.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("featured.empty")}</p>
        ) : (
          <div className="mt-4 space-y-2">
            {featured.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
                <span className="capitalize">{f.surface}</span>
                <span className="text-muted-foreground">{f.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(iso));
}
