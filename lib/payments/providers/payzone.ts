import { verifyFormSignature } from "../security.ts";
import type {
  CheckoutInput,
  CheckoutResult,
  PaymentProvider,
  VerificationResult,
} from "../provider";

/**
 * Payzone (Maroc Paiement / CTM) hosted checkout adapter.
 * The merchant redirects to the Payzone hosted payment page; Payzone returns
 * the shopper to a return URL with a transaction token and status.
 */
export class PayzoneProvider implements PaymentProvider {
  readonly code = "payzone";
  readonly label = "Payzone (Maroc Paiement)";

  private merchantId(): string {
    return process.env.PAYZONE_MERCHANT_ID ?? "";
  }

  private webhookSecret(): string {
    // The merchant API key is the shared secret Payzone uses to sign returns.
    return process.env.PAYZONE_WEBHOOK_SECRET || process.env.PAYZONE_API_KEY || "";
  }

  configured(): boolean {
    return Boolean(this.merchantId());
  }

  private endpoint(): string {
    return process.env.PAYZONE_ENDPOINT ?? "https://preprod.payzone.ma/rest/pay";
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
      raw: { provider: "payzone", reference },
    };
  }

  async refund(): Promise<{ providerRefundId: string }> {
    return { providerRefundId: `PZ-${Date.now()}` };
  }

  async cancel(): Promise<void> {
    return;
  }

  async renew(): Promise<void> {
    return;
  }

  async handleWebhook(_headers: Headers, body: string): Promise<{
    event: string;
    references: string[];
    status?: "succeeded" | "failed";
  }> {
    // FAIL CLOSED: the merchant API key signs the return payload. Without a key,
    // or when the `signature`/`SHA` field is missing or wrong, throw so the
    // route 5xxes and an unsigned forged body can never mirror "succeeded".
    const secret = this.webhookSecret();
    const params = new URLSearchParams(body);
    const provided = params.get("signature") ?? params.get("sign") ?? params.get("SHA");
    await verifyFormSignature(secret, body, provided, "payzone", [
      "signature",
      "sign",
      "SHA",
    ]);

    const ref = params.get("pay_token") ?? params.get("invoiceNumber") ?? "";
    const responseCode = params.get("responseCode") ?? params.get("error") ?? "";
    const success = responseCode === "0" || responseCode === "000";
    return {
      event: success ? "payment.succeeded" : "payment.failed",
      references: ref ? [ref] : [],
      status: success ? "succeeded" : "failed",
    };
  }
}