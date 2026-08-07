import { randomUUID } from "crypto";
import type {
  CheckoutInput,
  CheckoutResult,
  PaymentProvider,
  VerificationResult,
} from "../provider";

/**
 * Offline / manual gateway (bank transfer, cash at a branch). Used when no
 * online payment provider is configured. Payment is created as "pending" and
 * must be confirmed by an admin, or by the owner when the reference matches.
 */
export class ManualProvider implements PaymentProvider {
  readonly code = "manual";
  readonly label = "Manual / Bank transfer";

  configured(): boolean {
    return true;
  }

  async createCheckout(_input: CheckoutInput): Promise<CheckoutResult> {
    void _input;
    const reference = `MAN-${randomUUID().slice(0, 8).toUpperCase()}`;
    return {
      url: null,
      paymentReference: reference,
      manual: true,
    };
  }

  async verifyPayment(reference: string): Promise<VerificationResult> {
    return { status: "pending", raw: { provider: "manual", reference } };
  }

  async refund(): Promise<{ providerRefundId: string }> {
    return { providerRefundId: `MANREF-${randomUUID().slice(0, 8)}` };
  }

  async cancel(): Promise<void> {
    return;
  }

  async renew(): Promise<void> {
    return;
  }

  async handleWebhook(): Promise<{ event: string; references: string[] }> {
    return { event: "ignored", references: [] };
  }
}