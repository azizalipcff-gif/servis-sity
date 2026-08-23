import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { assertSameOrigin } from "@/lib/security/csrf";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { isConversationMember } from "@/lib/messenger";
import { uuidSchema } from "@/lib/validations/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withErrorCapture("messenger.typing", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const limited = await rateLimit(req, { key: "typing", limit: 120, windowMs: 60000 });
    if (!limited.ok) return rateLimitResponse(limited.retryAfter);

    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const body = (await req.json().catch(() => ({}))) as {
      conversationId?: string;
      isTyping?: boolean;
    };
    const conversationId = body.conversationId;
    if (!conversationId || !uuidSchema.safeParse(conversationId).success) return jsonError(400, "bad_request");
    if (!(await isConversationMember(supabase, user.id, conversationId))) {
      return jsonError(403, "forbidden");
    }

    const { error } = await supabase.from("typing_status").upsert(
      {
        conversation_id: conversationId,
        user_id: user.id,
        is_typing: Boolean(body.isTyping),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "conversation_id,user_id" },
    );
    if (error) return jsonError(500, "update_failed");
    return jsonOk({ ok: true });
  });
}