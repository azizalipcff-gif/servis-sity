import { ManualProvider } from "./providers/manual";
import { StripeProvider } from "./providers/stripe";
import { PayPalProvider } from "./providers/paypal";
import { CmiMoroccoProvider } from "./providers/cmi";
import { PayzoneProvider } from "./providers/payzone";

export type PaymentStatus =
  | "succeeded"
  | "processing"
  | "pending"
  | "failed"
  | "cancelled"
  | "refunded";

export type CheckoutInput = {
  planCode: string;
  interval: string;
  billTitle: string;
  amountCents: number;
  currency: string;
  userId: string;
  businessId: string;
  idempotencyKey: string;
  returnUrl: string;
  cancelUrl: string;
  customerEmail?: string;
};

export type CheckoutResult = {
  url: string | null;
  paymentReference: string;
  /** When true the payment needs a manual/offline confirmation step. */
  manual?: boolean;
};

export type VerificationResult = {
  status: PaymentStatus;
  providerPaymentId?: string;
  raw: Record<string, unknown>;
};

export interface PaymentProvider {
  readonly code: string;
  readonly label: string;
  configured(): boolean;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  verifyPayment(reference: string): Promise<VerificationResult>;
  refund(paymentReference: string): Promise<{ providerRefundId: string }>;
  cancel(reference: string): Promise<void>;
  renew(reference: string): Promise<void>;
  handleWebhook(headers: Headers, body: string): Promise<{ event: string; references: string[]; status?: PaymentStatus }>;
}

const registry: PaymentProvider[] = [
  new StripeProvider(),
  new PayPalProvider(),
  new CmiMoroccoProvider(),
  new PayzoneProvider(),
  new ManualProvider(),
];

export function listProviders(): PaymentProvider[] {
  return registry;
}

/** Resolve the active provider; falls back to the offline manual gateway. */
export function resolveProvider(override?: string): PaymentProvider {
  const preferred = override ?? process.env.PAYMENT_PROVIDER;
  const match = preferred ? registry.find((p) => p.code === preferred) : undefined;
  if (match && match.configured()) return match;
  const manual = registry.find((p) => p.code === "manual");
  return manual ?? registry[0];
}

export function salesTaxRate(_currency: string): number {
  // VAT on digital services in Morocco is 20%.
  void _currency;
  return 0.2;
}