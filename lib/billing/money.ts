/** Money + billing-cycle helpers. Prices are stored as integer cents. */

export type Interval = "monthly" | "quarterly" | "yearly" | "lifetime";

export const INTERVALS: readonly Interval[] = ["monthly", "quarterly", "yearly", "lifetime"];

export function intervalMonths(interval: Interval): number | null {
  switch (interval) {
    case "monthly":
      return 1;
    case "quarterly":
      return 3;
    case "yearly":
      return 12;
    case "lifetime":
      return null;
  }
}

/** ISO date string for the next billing date given an interval. */
export function addInterval(interval: Interval, from = new Date()): Date {
  const months = intervalMonths(interval);
  if (months === null) return new Date(8640000000000000); // far future => lifetime
  const d = new Date(from);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

export function centsToAmount(cents: number): number {
  return Math.round(cents) / 100;
}

export function formatCurrency(cents: number, currency = "MAD", locale = "en"): string {
  const amount = centsToAmount(cents);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatCents(cents: number, currency = "MAD"): string {
  return `${centsToAmount(cents).toFixed(2)} ${currency}`;
}