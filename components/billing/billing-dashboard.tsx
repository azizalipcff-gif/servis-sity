"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type Sub = {
  id: string;
  plan_key: string | null;
  interval: string | null;
  status: string | null;
  started_at: string | null;
  expires_at: string | null;
  next_billing_at: string | null;
  auto_renew: boolean;
  lifetime: boolean;
};
type Invoice = { id: string; number: string; created_at: string; total_cents: number; currency: string; status: string };
type Payment = { id: string; amount_cents: number; currency: string; status: string; provider: string; created_at: string };
type Featured = { id: string; surface: string | null; status: string; expires_at: string | null; price_cents: number };

type DashboardData = {
  business: { id: string; name: string; plan: string } | null;
  current: Sub | null;
  currentPlan: { name: string } | null;
  invoices: Invoice[];
  payments: Payment[];
  transactions: Array<{ id: string; amount_cents: number; currency: string; status: string; created_at: string }>;
};

export function BillingDashboard() {
  const t = useTranslations("billing");
  const [data, setData] = useState<DashboardData | null>(null);
  const [featured, setFeatured] = useState<Featured[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const [res, fres] = await Promise.all([
        fetch("/api/billing/subscriptions"),
        fetch("/api/billing/featured"),
      ]);
      const d = await res.json().catch(() => null);
      const f = await fres.json().catch(() => null);
      setData(d);
      setFeatured(f?.items ?? []);
      setLoading(false);
    })();
  }, []);

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
      setData((prev) => prev && { ...prev, current: { ...prev.current!, status: action === "pause" ? "paused" : "active" } });
      setMsg(t("updated"));
    },
    [data, t],
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
      setFeatured((prev) => (body.item ? [...prev, body.item] : prev));
      setMsg(t("featured.orderCreated"));
    } else {
      setMsg(body.error ?? "error");
    }
  }, [data, t]);

  if (loading) return <div className="py-16 text-center text-muted-foreground">{t("processing")}</div>;

  const cur = data?.current;
  const planName = cur?.plan_key ?? data?.business?.plan ?? "free";

  return (
    <div className="space-y-8">
      {msg && <div className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-2 text-sm">{msg}</div>}

      <section className="rounded-3xl border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{t("currentPlan")}</h2>
            <p className="mt-1 text-2xl font-bold capitalize">{planName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {cur?.lifetime
                ? t("lifetime")
                : cur?.next_billing_at || cur?.expires_at
                  ? t("expiresAt", { date: formatDate(cur.next_billing_at ?? cur.expires_at!) })
                  : t("status_active")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {cur ? t(`status_${cur.status ?? "active"}`) : t("noPlan")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/pricing" className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background">
              {t("upgrade")}
            </Link>
            {cur && cur.auto_renew && (
              <button onClick={() => act("cancel")} className="rounded-xl border px-4 py-2 text-sm">
                {t("cancel")}
              </button>
            )}
          </div>
        </div>
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