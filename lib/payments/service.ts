import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PlanType } from "@/lib/supabase/database.types";
import { salesTaxRate } from "./provider";

type Sbc = SupabaseClient<Database>;

export type Totals = {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  taxRate: number;
  totalCents: number;
};

export function computeTotals(
  subtotalCents: number,
  discountCents = 0,
  currency = "MAD",
): Totals {
  const taxRate = salesTaxRate(currency);
  const taxable = Math.max(0, subtotalCents - discountCents);
  const taxCents = Math.round(taxable * taxRate);
  return {
    subtotalCents,
    discountCents,
    taxCents,
    taxRate,
    totalCents: taxable + taxCents,
  };
}

export function makeInvoiceNumber(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `INV-${ymd}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function issueInvoice(
  supabase: Sbc,
  opts: {
    userId: string;
    businessId: string | null;
    subscriptionId: string | null;
    paymentId: string | null;
    invoiceType: string;
    description: string;
    subtotalCents: number;
    discountCents: number;
    taxRate: number;
    taxCents: number;
    totalCents: number;
    currency: string;
    status?: string;
  },
) {
  const { data: inv } = await supabase
    .from("invoices")
    .insert({
      number: makeInvoiceNumber(),
      business_id: opts.businessId!,
      user_id: opts.userId,
      subscription_id: opts.subscriptionId,
      payment_id: opts.paymentId,
      invoice_type: opts.invoiceType,
      status: opts.status ?? "draft",
      subtotal_cents: opts.subtotalCents,
      discount_cents: opts.discountCents,
      tax_cents: opts.taxCents,
      tax_rate: opts.taxRate,
      total_cents: opts.totalCents,
      currency: opts.currency,
      issued_at: new Date().toISOString(),
      due_date: new Date(Date.now() + 86400000 * 30).toISOString(),
      paid_at: opts.status === "paid" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (inv) {
    await supabase.from("invoice_items").insert({
      invoice_id: inv.id,
      description: opts.description,
      kind: opts.invoiceType,
      quantity: 1,
      unit_price_cents: opts.subtotalCents,
      amount_cents: opts.totalCents,
      tax_cents: opts.taxCents,
    });
  }
  return inv;
}

export async function recordPayment(
  supabase: Sbc,
  opts: {
    userId: string;
    businessId: string | null;
    subscriptionId: string | null;
    provider: string;
    amountCents: number;
    currency: string;
    status: string;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
  },
) {
  if (opts.idempotencyKey) {
    const { data: existing } = await supabase
      .from("payments")
      .select("*")
      .eq("provider", opts.provider)
      .eq("idempotency_key", opts.idempotencyKey)
      .eq("user_id", opts.userId)
      .maybeSingle();
    if (existing) return existing;
  }

  const { data, error } = await supabase
    .from("payments")
    .insert({
      user_id: opts.userId,
      business_id: opts.businessId,
      subscription_id: opts.subscriptionId,
      provider: opts.provider,
      amount_cents: opts.amountCents,
      currency: opts.currency,
      status: opts.status,
      idempotency_key: opts.idempotencyKey,
      metadata: opts.metadata ?? {},
    })
    .select("*")
    .single();
  if (error) throw new Error(`record_payment:${error.message}`);
  return data;
}

export async function recordAttempt(
  supabase: Sbc,
  paymentId: string,
  provider: string,
  status: string,
  extra?: { attemptNo?: number; errorMessage?: string; response?: Record<string, unknown> },
) {
  await supabase.from("payment_attempts").insert({
    payment_id: paymentId,
    provider,
    attempt_no: extra?.attemptNo ?? 1,
    status,
    response: extra?.response ?? null,
    error_message: extra?.errorMessage ?? null,
  });
}

function monthsOfInterval(iv: string): number {
  switch (iv) {
    case "monthly":
      return 1;
    case "quarterly":
      return 3;
    case "yearly":
      return 12;
    case "lifetime":
      return 0;
    default:
      return 1;
  }
}

function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  if (months <= 0) return d;
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/**
 * Idempotent finalization of a successful payment: mark the payment paid,
 * create/activate the subscription, sync the business plan, write history,
 * record a transaction, issue an invoice and notify via the caller.
 */
export async function finalizeSuccessfulPayment(
  supabase: Sbc,
  opts: {
    userId: string;
    businessId: string;
    paymentId: string;
    planCode: PlanType;
    intervalType: string;
    planName: string;
    amountCents: number;
    currency: string;
    discountCents?: number;
    taxRate: number;
    taxCents: number;
    totalCents: number;
    lifetime?: boolean;
    couponId?: string | null;
  },
) {
  const now = new Date();
  const lifetime = opts.lifetime ?? opts.intervalType === "lifetime";
  const periodMonths = monthsOfInterval(opts.intervalType);

  // Idempotency guard: never activate the same payment twice. The admin route
  // also guards on payment.status, but that is NOT a reliable "already
  // finalized" signal here — the route marks the payment succeeded BEFORE it
  // calls us — so we key off the durable marker: a transaction already linked
  // to this payment.
  const { data: existingPayment } = await supabase
    .from("payments")
    .select("id,status")
    .eq("id", opts.paymentId)
    .maybeSingle();
  if (!existingPayment) throw new Error(`finalize:payment_not_found`);

  const { data: existingTx } = await supabase
    .from("transactions")
    .select("id")
    .eq("payment_id", opts.paymentId)
    .maybeSingle();
  if (existingTx) return { subscriptionId: null, invoiceId: null, skipped: true };

  const { error: payErr } = await supabase
    .from("payments")
    .update({ status: "succeeded" })
    .eq("id", opts.paymentId);
  if (payErr) throw new Error(`finalize:mark_paid:${payErr.message}`);

  const { data: sub, error: subErr } = await supabase
    .from("subscriptions")
    .insert({
      business_id: opts.businessId,
      plan: opts.planCode,
      plan_key: opts.planCode,
      interval: opts.intervalType,
      status: "active",
      provider: null,
      started_at: now.toISOString(),
      expires_at: lifetime ? null : addMonths(now, periodMonths).toISOString(),
      next_billing_at: lifetime ? null : addMonths(now, periodMonths).toISOString(),
      lifetime,
      auto_renew: !lifetime,
    })
    .select("*")
    .single();
  if (subErr) throw new Error(`finalize:create_subscription:${subErr.message}`);

  const { error: bizErr } = await supabase
    .from("businesses")
    .update({ plan: opts.planCode })
    .eq("id", opts.businessId);
  if (bizErr) throw new Error(`finalize:update_business:${bizErr.message}`);

  const { error: histErr } = await supabase.from("subscription_history").insert({
    subscription_id: sub?.id ?? null,
    business_id: opts.businessId,
    action: "create",
    plan_to: opts.planCode,
    interval: opts.intervalType,
    period_start: now.toISOString(),
    period_end: periodEnd(now, opts.intervalType),
    amount_cents: opts.totalCents,
    currency: opts.currency,
  });
  if (histErr) throw new Error(`finalize:history:${histErr.message}`);

  // Invoice must exist before the ledger RPC so coupon usage can link to it.
  const invoice = await issueInvoice(supabase, {
    userId: opts.userId,
    businessId: opts.businessId,
    subscriptionId: sub?.id ?? null,
    paymentId: opts.paymentId,
    invoiceType: "subscription",
    description: opts.planName,
    subtotalCents: opts.amountCents,
    discountCents: opts.discountCents ?? 0,
    taxRate: opts.taxRate,
    taxCents: opts.taxCents,
    totalCents: opts.totalCents,
    currency: opts.currency,
    status: "paid",
  });

  // Trusted ledger write (transaction + coupon usage) via the SECURITY DEFINER
  // RPC. It runs under the admin session, but derives ownership from the
  // payment record and requires payment.status = 'succeeded', so a normal user
  // (or even an admin) can never attribute a row to an arbitrary customer.
  const { error: ledgerErr } = await supabase.rpc("finalize_payment_ledger", {
    p_payment_id: opts.paymentId,
    p_user_id: opts.userId,
    p_business_id: opts.businessId,
    p_currency: opts.currency,
    p_amount_cents: opts.totalCents,
    p_reference: `SUB-${opts.planCode.toUpperCase()}-${opts.intervalType}`,
    p_invoice_id: invoice?.id ?? undefined,
    p_coupon_id: opts.couponId ?? undefined,
    p_discount_cents: opts.discountCents ?? 0,
  });
  if (ledgerErr) throw new Error(`finalize:ledger:${ledgerErr.message}`);

  return { subscriptionId: sub?.id ?? null, invoiceId: invoice?.id ?? null };
}

function periodEnd(from: Date, iv: string): string | null {
  const months = monthsOfInterval(iv);
  return months <= 0 ? null : addMonths(from, months).toISOString();
}