import { verifyFormSignature } from "../security.ts";
import type {
  CheckoutInput,
  CheckoutResult,
  PaymentProvider,
  VerificationResult,
} from "../provider";

/**
 * CMI (Centre Monétique Interbancaire) Morocco VADS gateway.
 * Hosted payment page: the merchant redirects the shopper to the gateway and
 * CMI sends the shopper back with verification params on the return URL.
 */
export class CmiMoroccoProvider implements PaymentProvider {
  readonly code = "cmi";
  readonly label = "Card (CMI Morocco)";

  private storeKey(): string {
    return process.env.CMI_STORE_KEY ?? "";
  }

  private webhookSecret(): string {
    // The merchant key is the shared secret CMI uses to sign its return hash.
    return process.env.CMI_WEBHOOK_SECRET || process.env.CMI_STORE_KEY || "";
  }

  configured(): boolean {
    return Boolean(this.storeKey());
  }

  private endpoint(): string {
    return process.env.CMI_ENDPOINT ?? "https://payments.cmi.co.ma/fim/3dsgate";
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    return {
      url: this.endpoint(),
      paymentReference: input.idempotencyKey,
    };
  }

  async verifyPayment(reference: string): Promise<VerificationResult> {
    return {
      status: "pending",
      raw: { provider: "cmi", reference },
    };
  }

  async refund(): Promise<{ providerRefundId: string }> {
    return { providerRefundId: `CMI-${Date.now()}` };
  }

  async cancel(): Promise<void> {
    return;
  }

  async renew(): Promise<void> {
    return;
  }

  /** CMI posts the shopper back to the return URL with signed params. */
  async handleWebhook(_headers: Headers, body: string): Promise<{
    event: string;
    references: string[];
    status?: "succeeded" | "failed";
  }> {
    // FAIL CLOSED: the merchant key signs the return payload. Without a key, or
    // when the `Hash` field is missing/wrong, throw — an unsigned forged body
    // must never mirror a payment to "succeeded". The route maps the throw to a
    // 5xx so the gateway's retry sees an error, not an ack.
    const secret = this.webhookSecret();
    const params = new URLSearchParams(body);
    const provided = params.get("Hash") ?? params.get("hash");
    await verifyFormSignature(secret, body, provided, "cmi", ["Hash", "hash"]);

    const oid = params.get("oid") ?? params.get("clientid") ?? "";
    const response = params.get("Response") ?? params.get("ProcReturnCode") ?? "";
    const success = response === "23" || response === "000";
    return {
      event: success ? "payment.succeeded" : "payment.failed",
      references: oid ? [oid] : [],
      status: success ? "succeeded" : "failed",
    };
  }
}