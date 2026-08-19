import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { isConversationMember } from "@/lib/messenger";
import { uuidSchema } from "@/lib/validations/schemas";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorCapture("messenger.conversation.patch", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");

    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return jsonError(400, "bad_request");
    if (!(await isConversationMember(supabase, user.id, id))) {
      return jsonError(403, "forbidden");
    }

    const body = (await req.json().catch(() => ({}))) as {
      action: string;
      mutedUntil?: string;
      markRead?: boolean;
    };

    const patch: {
      archived_at?: string | null;
      pinned_at?: string | null;
      muted_until?: string | null;
      last_read_at?: string;
    } = {};
    switch (body.action) {
      case "archive":
        patch.archived_at = new Date().toISOString();
        break;
      case "unarchive":
        patch.archived_at = null;
        break;
      case "pin":
        patch.pinned_at = new Date().toISOString();
        break;
      case "unpin":
        patch.pinned_at = null;
        break;
      case "mute":
        patch.muted_until = body.mutedUntil ?? new Date(Date.now() + 86400000 * 30).toISOString();
        break;
case "unmute":
        patch.muted_until = null;
        break;
      default:
        return jsonError(400, "bad_request");
    }
    if (body.markRead) {
      patch.last_read_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("conversation_members")
      .update(patch)
      .eq("conversation_id", id)
      .eq("user_id", user.id);
    if (error) return jsonError(500, "update_failed");
    return jsonOk({ ok: true });
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorCapture("messenger.conversation.delete", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");

    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return jsonError(400, "bad_request");
    // Leave conversation (archive for the member).
    const { error } = await supabase
      .from("conversation_members")
      .update({ archived_at: new Date().toISOString() })
      .eq("conversation_id", id)
      .eq("user_id", user.id);
    if (error) return jsonError(500, "update_failed");
    return jsonOk({ ok: true });
  });
}