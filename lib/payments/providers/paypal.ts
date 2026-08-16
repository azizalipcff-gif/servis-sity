import type {
  CheckoutInput,
  CheckoutResult,
  PaymentProvider,
  PaymentStatus,
  VerificationResult,
} from "../provider";

type PayPalOrder = {
  id: string;
  status: string;
  links?: { rel: string; href: string }[];
  purchase_units?: {
    payments?: {
      captures?: { id?: string; status: string }[];
    }[];
  }[];
};

export class PayPalProvider implements PaymentProvider {
  readonly code = "paypal";
  readonly label = "PayPal";

  private clientId(): string {
    return process.env.PAYPAL_CLIENT_ID ?? "";
  }

  private secret(): string {
    return process.env.PAYPAL_CLIENT_SECRET ?? "";
  }

  private base(): string {
    return process.env.PAYPAL_API_BASE ?? "https://api-m.paypal.com";
  }

  configured(): boolean {
    return Boolean(this.clientId() && this.secret());
  }

  private async token(): Promise<string> {
    const res = await fetch(`${this.base()}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.clientId()}:${this.secret()}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`paypal:auth:${res.status}`);
    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const token = await this.token();
    const res = await fetch(`${this.base()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            custom_id: input.idempotencyKey,
            description: input.billTitle,
            amount: {
              currency_code: input.currency,
              value: (input.amountCents / 100).toFixed(2),
            },
          },
        ],
        application_context: {
          return_url: input.returnUrl,
          cancel_url: input.cancelUrl,
        },
      }),
    });
    if (!res.ok) throw new Error(`paypal:order:${res.status}`);
    const order = (await res.json()) as PayPalOrder;
    const approve = order.links?.find((l) => l.rel === "approve")?.href ?? null;
    return { url: approve, paymentReference: order.id };
  }

  async verifyPayment(reference: string): Promise<VerificationResult> {
    const token = await this.token();
    const res = await fetch(`${this.base()}/v2/checkout/orders/${reference}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`paypal:get:${res.status}`);
    const order = (await res.json()) as PayPalOrder;

    if (order.status === "APPROVED") {
      const capture = await fetch(`${this.base()}/v2/checkout/orders/${reference}/capture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (capture.ok) {
        const cap = (await capture.json()) as PayPalOrder;
        const ok = cap.purchase_units?.[0]?.payments?.[0]?.captures?.[0]?.status === "COMPLETED";
        return { status: ok ? "succeeded" : "processing", providerPaymentId: reference, raw: cap as unknown as Record<string, unknown> };
      }
    }
    const status: PaymentStatus =
      order.status === "COMPLETED" ? "succeeded" : order.status === "VOIDED" ? "cancelled" : "pending";
    return { status, providerPaymentId: reference, raw: order as unknown as Record<string, unknown> };
  }

  async refund(paymentReference: string): Promise<{ providerRefundId: string }> {
    const token = await this.token();
    // The stored reference is the order id. Refunds target a capture, so
    // resolve the capture id from the order first.
    let captureId = paymentReference;
    if (!paymentReference.startsWith("3V") && !paymentReference.startsWith("2W")) {
      const orderRes = await fetch(`${this.base()}/v2/checkout/orders/${paymentReference}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!orderRes.ok) throw new Error(`paypal:refund:get_order:${orderRes.status}`);
      const order = (await orderRes.json()) as PayPalOrder;
      const capture =
        order.purchase_units?.[0]?.payments?.[0]?.captures?.find(
          (c) => c.status === "COMPLETED" || c.status === "PARTIALLY_REFUNDED",
        );
      if (!capture?.id) throw new Error("paypal:refund:no_capture");
      captureId = capture.id;
    }
    const res = await fetch(`${this.base()}/v2/payments/refunds`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ capture_id: captureId }),
    });
    if (!res.ok) throw new Error(`paypal:refund:${res.status}`);
    const data = (await res.json()) as { id: string };
    return { providerRefundId: data.id };
  }

  async cancel(reference: string): Promise<void> {
    await this.verifyPayment(reference);
  }

  async renew(): Promise<void> {
    return;
  }

  async handleWebhook(headers: Headers, body: string): Promise<{ event: string; references: string[]; status?: PaymentStatus }> {
    // PayPal webhooks are verified via the verifyWebhookSignature API; implement
    // a strict check using the configured webhook id when present.
    const webhookId = process.env.PAYPAL_WEBHOOK_ID ?? "";
    const token = await this.token();
    try {
      const res = await fetch(`${this.base()}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_algo: headers.get("paypal-auth-algo"),
          cert_url: headers.get("paypal-cert-url"),
          transmission_id: headers.get("paypal-transmission-id"),
          transmission_sig: headers.get("paypal-transmission-sig"),
          transmission_time: headers.get("paypal-transmission-time"),
          webhook_id: webhookId,
          webhook_event: JSON.parse(body),
        }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`paypal:webhook_sig:${res.status}`);
      const data = (await res.json()) as { verification_status: string };
      if (data.verification_status !== "SUCCESS") throw new Error("paypal:webhook:bad_signature");
    } catch {
      if (!webhookId) throw new Error("paypal:webhook:no_webhook_id");
      throw new Error("paypal:webhook:invalid_signature");
    }
    const event = JSON.parse(body) as {
      event_type?: string;
      resource?: { id?: string; custom_id?: string; status?: string };
    };
    return {
      event: event.event_type ?? "unknown",
      references: event.resource?.custom_id ? [event.resource.custom_id] : event.resource?.id ? [event.resource.id] : [],
      status: event.event_type === "PAYMENT.CAPTURE.COMPLETED" ? "succeeded" : undefined,
    };
  }
}