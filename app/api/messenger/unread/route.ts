import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return withErrorCapture("messenger.unread", async () => {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    // Single RPC (0034) — was one count query per conversation.
    const { data, error } = await supabase.rpc("messenger_unread_counts");
    if (error) return jsonError(500, "query_failed");

    const total = (data ?? []).reduce((sum, row) => sum + Number(row.unread ?? 0), 0);
    return jsonOk({ unread: total });
  });
}
