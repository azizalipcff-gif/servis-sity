/** Tolerant display mapping for free-text statuses across businesses/services/products. */
export function statusTone(
  status: string | null | undefined,
): "success" | "warning" | "danger" | "muted" {
  const value = (status ?? "").toLowerCase();
  if (["approved", "active", "published", "verified"].includes(value)) return "success";
  if (["pending", "pending_review", "draft", "paused"].includes(value)) return "warning";
  if (["rejected", "suspended", "inactive", "archived", "banned"].includes(value)) return "danger";
  return "muted";
}