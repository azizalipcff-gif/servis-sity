import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return withErrorCapture("messenger.unread", async () => {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const { data } = await supabase
      .from("conversation_members")
      .select("conversation_id,last_read_at")
      .eq("user_id", user.id)
      .is("archived_at", null);

    let total = 0;
    for (const m of data ?? []) {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", m.conversation_id)
        .neq("sender_id", user.id)
        .gt("created_at", m.last_read_at)
        .is("deleted_at", null);
      total += count ?? 0;
    }

    return jsonOk({ unread: total });
  });
}