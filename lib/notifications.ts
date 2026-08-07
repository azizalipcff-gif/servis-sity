import { createClient } from "@/lib/supabase/server";

export type NotificationType =
  | "general"
  | "like"
  | "review"
  | "booking"
  | "message"
  | "verification"
  | "subscription"
  | "payment"
  | "invoice"
  | "refund"
  | "coupon"
  | "featured"
  | "admin";

type NewNotification = {
  recipientId: string;
  type?: NotificationType;
  title: string;
  body?: string;
  link?: string | null;
};

/**
 * Insert a notification for the current user. RLS allows inserting only when
 * `recipient_id = auth.uid()`, so call this from routes that already verified
 * the recipient is the authenticated actor. Delivery is best-effort — a
 * failure never fails the parent action.
 */
export async function createNotification(input: NewNotification): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== input.recipientId) return;

  await supabase
    .from("notifications")
    .insert({
      recipient_id: input.recipientId,
      type: input.type ?? "general",
      title: input.title,
      body: input.body ?? "",
      link: input.link ?? null,
    })
    .then(({ error }) => {
      if (error) {
        console.error("createNotification:", error.message);
      }
    });
}

/** Unread notification count for the current session (0 when signed out). */
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .is("read_at", null);
  return count ?? 0;
}

/**
 * Notify any user. Inserting for the current actor uses the standard RLS path;
 * cross-user sends go through the security-definer `notify_recipient` RPC and
 * are only permitted when the caller is an admin (prevents spam).
 */
export async function notifyUser(input: {
  recipientId: string;
  type?: NotificationType;
  category?: string;
  title: string;
  body?: string;
  link?: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (user.id === input.recipientId) {
    await createNotification({
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
    });
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") return;

  await supabase.rpc("notify_recipient", {
    p_recipient: input.recipientId,
    p_type: input.type ?? "general",
    p_title: input.title,
    p_body: input.body ?? "",
    p_link: input.link ?? null,
    p_category: input.category ?? input.type ?? "general",
  });
}
