import type {
  CheckoutInput,
  CheckoutResult,
  PaymentProvider,
  PaymentStatus,
  VerificationResult,
} from "../provider";

const STRIPE_BASE = "https://api.stripe.com/v1";

function formUrlEncode(obj: Record<string, string | number>): string {
  return new URLSearchParams(
    Object.entries(obj).map(([k, v]) => [k, String(v)]),
  ).toString();
}

export class StripeProvider implements PaymentProvider {
  readonly code = "stripe";
  readonly label = "Card (Stripe)";

  private key(): string {
    return process.env.STRIPE_SECRET_KEY ?? "";
  }

  configured(): boolean {
    return Boolean(this.key());
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const params = new URLSearchParams();
    params.set("mode", "payment");
    if (input.customerEmail) params.set("customer_email", input.customerEmail);
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", input.currency.toLowerCase());
    params.set("line_items[0][price_data][product_data][name]", input.billTitle);
    params.set("line_items[0][price_data][unit_amount]", String(input.amountCents));
    params.set(
      "success_url",
      `${input.returnUrl}?session_id={CHECKOUT_SESSION_ID}&ref=${input.idempotencyKey}`,
    );
    params.set("cancel_url", input.cancelUrl);
    params.set("client_reference_id", input.idempotencyKey);
    params.set("metadata[business]", input.businessId);
    params.set("metadata[plan]", input.planCode);
    params.set("metadata[interval]", input.interval);

    const res = await fetch(`${STRIPE_BASE}/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.key()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!res.ok) throw new Error(`stripe:checkout:${res.status}`);
    const data = (await res.json()) as { id: string; url: string | null };
    return { url: data.url, paymentReference: data.id };
  }

  async verifyPayment(reference: string): Promise<VerificationResult> {
    const res = await fetch(`${STRIPE_BASE}/checkout/sessions/${reference}`, {
      headers: { Authorization: `Bearer ${this.key()}` },
    });
    if (!res.ok) throw new Error(`stripe:verify:${res.status}`);
    const data = (await res.json()) as {
      payment_status?: string;
      payment_intent?: string | null;
      metadata?: Record<string, string>;
    };
    const status: PaymentStatus =
      data.payment_status === "paid"
        ? "succeeded"
        : data.payment_status === "unpaid"
          ? "processing"
          : "pending";
    return {
      status,
      providerPaymentId: (data.payment_intent as string) ?? undefined,
      raw: data as unknown as Record<string, unknown>,
    };
  }

  async refund(paymentReference: string): Promise<{ providerRefundId: string }> {
    const res = await fetch(`${STRIPE_BASE}/refunds`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.key()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formUrlEncode({ payment_intent: paymentReference }),
    });
    if (!res.ok) throw new Error(`stripe:refund:${res.status}`);
    const data = (await res.json()) as { id: string };
    return { providerRefundId: data.id };
  }

  async cancel(reference: string): Promise<void> {
    await fetch(`${STRIPE_BASE}/checkout/sessions/${reference}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.key()}` },
    });
  }

  async renew(_reference: string): Promise<void> {
    // Next billing is handled by the renewal worker invoking createCheckout again.
    void _reference;
    return;
  }

  async handleWebhook(headers: Headers, body: string): Promise<{ event: string; references: string[]; status?: PaymentStatus }> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
    if (!secret) throw new Error("stripe:webhook:no_secret");
    const sig = headers.get("stripe-signature") ?? "";
    if (!sig) throw new Error("stripe:webhook:bad_signature");

    const expected = await this.sign(secret, body);
    if (!sig.split(",").some((part) => part === `v1=${expected}`)) {
      throw new Error("stripe:webhook:invalid_signature");
    }

    const event = JSON.parse(body) as {
      type?: string;
      data?: { object?: { id?: string; payment_status?: string } };
    };
    return {
      event: event.type ?? "unknown",
      references: event.data?.object?.id ? [event.data.object.id] : [],
      status:
        event.type === "checkout.session.completed" && event.data?.object?.payment_status === "paid"
          ? "succeeded"
          : undefined,
    };
  }

  private async sign(secret: string, payload: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}