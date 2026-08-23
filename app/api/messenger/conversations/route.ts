import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { assertSameOrigin } from "@/lib/security/csrf";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import {
  listConversations,
  getOrCreateConversation,
  isBlocked,
} from "@/lib/messenger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withErrorCapture("messenger.conversations.list", async () => {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const url = new URL(req.url);
    const includeArchived = url.searchParams.get("archived") === "1";
    const conversations = await listConversations(supabase, user.id, includeArchived);
    return jsonOk({ conversations });
  });
}

export async function POST(req: NextRequest) {
  return withErrorCapture("messenger.conversations.create", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const limited = await rateLimit(req, { key: "conversation.create", limit: 30, windowMs: 60000 });
    if (!limited.ok) return rateLimitResponse(limited.retryAfter);

    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const body = (await req.json().catch(() => ({}))) as {
      userId?: string;
      businessId?: string;
    };

    const result = await getOrCreateConversation(supabase, user.id, {
      userId: body.userId,
      businessId: body.businessId,
    });
    if (result.error) {
      if (result.error === "self") return jsonError(400, "cannot_message_self");
      if (result.error === "not_found") return jsonError(404, "not_found");
      return jsonError(400, result.error);
    }
    if (!result.id) return jsonError(500, "internal_error");

    const { data: peer } = await supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", result.id)
      .neq("user_id", user.id)
      .limit(1);
    const peerId = peer?.[0]?.user_id ?? null;
    if (peerId && (await isBlocked(supabase, user.id, peerId))) {
      return jsonError(403, "blocked");
    }

    return jsonOk({ id: result.id });
  });
}