/**
 * Business Owner Dashboard — profile completeness engine.
 *
 * Dashboard completeness is computed from REAL business data on every render
 * (never the DB trigger's legacy 6-field snapshot). Checklist items
 * (description, logo, cover, phone, WhatsApp, address, city, services,
 * hours, verification) map to actionable dashboard tabs.
 *
 * Weights sum to 100.
 */

export type DashboardTab =
  | "analytics"
  | "bookings"
  | "reviews"
  | "gallery"
  | "services"
  | "products"
  | "plan"
  | "verification";

export type CompletenessItemKey =
  | "description"
  | "logo"
  | "cover"
  | "phone"
  | "whatsapp"
  | "address"
  | "city"
  | "services"
  | "hours"
  | "verification";

export type CompletenessInput = {
  description?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  city_id?: string | null;
  verification_status?: string | null;
  servicesCount?: number;
  hoursCount?: number;
};

export type CompletenessItem = {
  key: CompletenessItemKey;
  /** i18n key suffix resolved under `dashboard.dash`. */
  titleKey: string;
  /** i18n key suffix resolved under `dashboard.dash`. */
  hintKey: string;
  /** Dashboard tab that leads to the fix. */
  tab: DashboardTab;
  points: number;
  done: boolean;
};

export const COMPLETENESS_ITEMS: readonly Omit<
  CompletenessItem,
  "done"
>[] = [
  { key: "description", titleKey: "completenessDescription", hintKey: "completenessDescriptionHint", tab: "plan", points: 15 },
  { key: "logo", titleKey: "completenessLogo", hintKey: "completenessLogoHint", tab: "plan", points: 15 },
  { key: "cover", titleKey: "completenessCover", hintKey: "completenessCoverHint", tab: "plan", points: 10 },
  { key: "phone", titleKey: "completenessPhone", hintKey: "completenessPhoneHint", tab: "plan", points: 10 },
  { key: "whatsapp", titleKey: "completenessWhatsapp", hintKey: "completenessWhatsappHint", tab: "plan", points: 10 },
  { key: "address", titleKey: "completenessAddress", hintKey: "completenessAddressHint", tab: "plan", points: 5 },
  { key: "city", titleKey: "completenessCity", hintKey: "completenessCityHint", tab: "plan", points: 10 },
  { key: "services", titleKey: "completenessServices", hintKey: "completenessServicesHint", tab: "services", points: 15 },
  { key: "hours", titleKey: "completenessHours", hintKey: "completenessHoursHint", tab: "plan", points: 5 },
  { key: "verification", titleKey: "completenessVerification", hintKey: "completenessVerificationHint", tab: "verification", points: 5 },
];

const TEXT_NONEMPTY = (v?: string | null) => Boolean(v && v.trim().length > 0);

export function isCompletenessItemDone(
  key: CompletenessItemKey,
  data: CompletenessInput,
): boolean {
  switch (key) {
    case "description":
      return TEXT_NONEMPTY(data.description);
    case "logo":
      return TEXT_NONEMPTY(data.logo_url);
    case "cover":
      return TEXT_NONEMPTY(data.cover_url);
    case "phone":
      return TEXT_NONEMPTY(data.phone);
    case "whatsapp":
      return TEXT_NONEMPTY(data.whatsapp);
    case "address":
      return TEXT_NONEMPTY(data.address);
    case "city":
      return Boolean(data.city_id);
    case "services":
      return (data.servicesCount ?? 0) >= 3;
    case "hours":
      return (data.hoursCount ?? 0) > 0;
    case "verification":
      return data.verification_status === "verified";
  }
}

export function computeProfileCompleteness(
  data: CompletenessInput,
): { score: number; items: CompletenessItem[] } {
  const items = COMPLETENESS_ITEMS.map((def) => ({
    ...def,
    done: isCompletenessItemDone(def.key, data),
  }));
  const score = items.reduce((sum, item) => sum + (item.done ? item.points : 0), 0);
  return { score, items };
}

/** Items that still need work, most valuable first. */
export function incompleteCompletenessItems(
  data: CompletenessInput,
): CompletenessItem[] {
  const { items } = computeProfileCompleteness(data);
  return items
    .filter((item) => !item.done)
    .sort((a, b) => b.points - a.points);
}