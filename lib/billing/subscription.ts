import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  deriveSubscriptionState,
  isEntitled,
  type SubscriptionState,
} from "./subscription-state";

type Sbc = SupabaseClient<Database>;

export type CurrentSubscription = {
  subscription: unknown | null;
  state: SubscriptionState;
  entitled: boolean;
};

/**
 * Resolve the effective subscription for a business from the database.
 * Ownership must be enforced by the caller (RLS + business ownership checks);
 * this function only resolves the row for an already-authorized business.
 */
export async function getCurrentSubscription(
  supabase: Sbc,
  businessId: string,
): Promise<CurrentSubscription> {
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const state = deriveSubscriptionState(data);
  return { subscription: data ?? null, state, entitled: isEntitled(state) };
}

/**
 * Find the business's active subscription id if one is entitled right now.
 * Used to reject duplicate paid subscriptions at checkout time.
 */
export async function findActiveSubscriptionId(
  supabase: Sbc,
  businessId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("id,status,lifetime,expires_at,cancelled_at,cancel_at,paused_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (!data) return null;

  for (const sub of data) {
    const state = deriveSubscriptionState(sub);
    if (isEntitled(state)) return sub.id;
  }
  return null;
}
