/**
 * Audit logging for sensitive/admin actions.
 * Writes to `audit_logs` (RLS: admins read, server inserts via anon key with
 * insert-only policy). Best-effort and non-fatal.
 */

export type AuditAction =
  | "admin.login"
  | "user.role_change"
  | "user.ban"
  | "user.unban"
  | "user.suspend"
  | "user.unsuspend"
  | "user.delete"
  | "business.status_change"
  | "business.plan_change"
  | "business.verify"
  | "business.reject_verification"
  | "business.delete"
  | "report.resolve"
  | "category.create"
  | "category.delete"
  | "city.create"
  | "city.delete";

export async function writeAudit(opts: {
  actorId: string;
  action: AuditAction;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  if (typeof window !== "undefined") return;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    await supabase.from("audit_logs").insert({
      actor_id: opts.actorId,
      action: opts.action,
      target_type: opts.targetType,
      target_id: opts.targetId ?? null,
      metadata: opts.metadata ?? null,
    });
  } catch {
    // audit must never break the mutation
  }
}