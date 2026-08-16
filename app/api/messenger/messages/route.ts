import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { parseStoredUrl } from "@/lib/supabase/storage";
import { assertSameOrigin } from "@/lib/security/csrf";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { withErrorCapture, jsonError, jsonOk } from "@/lib/security/http";
import { sanitizeText } from "@/lib/security/sanitize";
import { uuidSchema } from "@/lib/validations/schemas";
import {
  isConversationMember,
  isBlocked,
} from "@/lib/messenger";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["text", "image", "file", "voice", "emoji"]);
const MAX_BODY = 4000;
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");

function isTrustedUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return supabaseUrl ? u.origin === supabaseUrl : true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  return withErrorCapture("messenger.messages.list", async () => {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");
    if (!conversationId || !uuidSchema.safeParse(conversationId).success) {
      return jsonError(400, "bad_request");
    }
    if (!(await isConversationMember(supabase, user.id, conversationId))) {
      return jsonError(403, "forbidden");
    }

    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 40), 1), 100);
    const before = url.searchParams.get("before");

    let q = supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (before) q = q.lt("created_at", before);

    const { data: rows, error } = await q;
    if (error) return jsonError(500, "load_failed");

    const ids = (rows ?? []).map((m) => m.id);
    const reactions: Record<string, { emoji: string; user_id: string }[]> = {};
    const reads: Record<string, string[]> = {};

    if (ids.length) {
      const { data: r } = await supabase
        .from("message_reactions")
        .select("message_id,emoji,user_id")
        .in("message_id", ids);
      (r ?? []).forEach((row) => {
        (reactions[row.message_id] ??= []).push({ emoji: row.emoji, user_id: row.user_id });
      });

      const { data: rd } = await supabase
        .from("message_reads")
        .select("message_id,user_id")
        .in("message_id", ids)
        .neq("user_id", user.id);
      (rd ?? []).forEach((row) => {
        (reads[row.message_id] ??= []).push(row.user_id);
      });
    }

    // Keep oldest first for the client.
    const messages = (rows ?? []).slice().reverse();
    return jsonOk({ messages, reactions, reads });
  });
}

export async function POST(req: NextRequest) {
  return withErrorCapture("messenger.messages.send", async () => {
    const t0 = Date.now();
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const limited = rateLimit(req, { key: "message.send", limit: 40, windowMs: 60000 });
    if (!limited.ok) return rateLimitResponse(limited.retryAfter);

    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const body = (await req.json().catch(() => ({}))) as {
      conversationId?: string;
      type?: string;
      body?: string;
      attachmentUrl?: string | null;
      attachmentName?: string | null;
      attachmentMeta?: { kind?: string; size?: number; mime?: string; width?: number; height?: number; duration?: number };
      replyTo?: string | null;
    };

    const conversationId = body.conversationId;
    if (
      !conversationId ||
      !uuidSchema.safeParse(conversationId).success ||
      !ALLOWED_TYPES.has(body.type ?? "text")
    ) {
      return jsonError(400, "bad_request");
    }
    if (body.replyTo && !uuidSchema.safeParse(body.replyTo).success) {
      return jsonError(400, "bad_request");
    }
    if (!(await isConversationMember(supabase, user.id, conversationId))) {
      return jsonError(403, "forbidden");
    }

    // Peer block check.
    const { data: members } = await supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", user.id)
      .limit(1);
    const peerId = members?.[0]?.user_id ?? null;
    if (peerId && (await isBlocked(supabase, user.id, peerId))) {
      return jsonError(403, "blocked");
    }

    const type = body.type ?? "text";
    const text = sanitizeText(String(body.body ?? ""), MAX_BODY);
    if (type === "text" || type === "emoji") {
      if (!text.trim()) return jsonError(400, "bad_request");
    } else {
      if (!isTrustedUrl(body.attachmentUrl)) return jsonError(400, "bad_request");
    }
    if (type === "text" && text.length > MAX_BODY) return jsonError(413, "too_large");

    const t1 = Date.now();
    const { data: msg, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        type,
        body: text,
        attachment_url: body.attachmentUrl ?? null,
        reply_to: body.replyTo ?? null,
      })
      .select("*")
      .single();
    if (error || !msg) return jsonError(500, "send_failed");
    const t2 = Date.now();

    if (process.env.NODE_ENV !== "production") {
      try {
        const { createClient: createLogClient } = await import("@/lib/supabase/server");
        const logSupabase = await createLogClient();
        await logSupabase.from("system_logs").insert({
          context: "latency.message.send",
          level: "warn",
          message: `totalMs=${t2 - t0} preMs=${t1 - t0} insertMs=${t2 - t1}`,
          meta: { conversationId, senderId: user.id, messageId: msg.id },
        });
      } catch {
        // diagnostics must never fail the request
      }
    }

    const meta = body.attachmentMeta;
    if (meta && msg.attachment_url) {
      await supabase.from("message_attachments").insert({
        message_id: msg.id,
        conversation_id: conversationId,
        kind: meta.kind ?? "file",
        url: msg.attachment_url,
        name: body.attachmentName ?? null,
        size: meta.size ?? 0,
        mime: meta.mime ?? null,
        width: meta.width ?? null,
        height: meta.height ?? null,
        duration: meta.duration ?? null,
      });
    }

    return jsonOk({ message: msg });
  });
}

export async function PATCH(req: NextRequest) {
  return withErrorCapture("messenger.messages.patch", async () => {
    if (!assertSameOrigin(req)) return jsonError(403, "csrf_rejected");
    const limited = rateLimit(req, { key: "message.action", limit: 60, windowMs: 60000 });
    if (!limited.ok) return rateLimitResponse(limited.retryAfter);

    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "unauthorized");

    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      action?: string;
      body?: string;
      emoji?: string;
      reason?: string;
      conversationId?: string;
    };

    if (body.action === "readAll") {
      if (!body.conversationId || !uuidSchema.safeParse(body.conversationId).success) {
        return jsonError(400, "bad_request");
      }
      if (!(await isConversationMember(supabase, user.id, body.conversationId))) {
        return jsonError(403, "forbidden");
      }
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("conversation_members")
        .update({ last_read_at: now })
        .eq("conversation_id", body.conversationId)
        .eq("user_id", user.id);
      if (error) return jsonError(500, "update_failed");
      return jsonOk({ ok: true });
    }

    const id = body.id;
    if (!id || !uuidSchema.safeParse(id).success) return jsonError(400, "bad_request");

    const { data: msg } = await supabase
      .from("messages")
      .select("id,conversation_id,sender_id,deleted_at")
      .eq("id", id)
      .maybeSingle();
    if (!msg) return jsonError(404, "not_found");
    if (msg.deleted_at) return jsonError(400, "deleted");
    if (!(await isConversationMember(supabase, user.id, msg.conversation_id))) {
      return jsonError(403, "forbidden");
    }

    switch (body.action) {
      case "edit": {
        if (msg.sender_id !== user.id) return jsonError(403, "forbidden");
        const newBody = sanitizeText(String(body.body ?? ""), MAX_BODY);
        if (!newBody.trim()) return jsonError(400, "bad_request");
        const { error } = await supabase
          .from("messages")
          .update({ body: newBody, edited_at: new Date().toISOString() })
          .eq("id", id)
          .eq("sender_id", user.id);
        if (error) return jsonError(500, "update_failed");
        return jsonOk({ ok: true });
      }
      case "unsend": {
        if (msg.sender_id !== user.id) return jsonError(403, "forbidden");

        // Capture attachment URLs first so we can clean up Storage objects
        // after the DB records are gone.
        const { data: attachments } = await supabase
          .from("message_attachments")
          .select("url")
          .eq("message_id", id);

        const { error } = await supabase
          .from("messages")
          .update({ deleted_at: new Date().toISOString(), body: "" })
          .eq("id", id)
          .eq("sender_id", user.id);
        if (error) return jsonError(500, "update_failed");
        await supabase
          .from("message_attachments")
          .delete()
          .eq("message_id", id);

        // Best-effort Storage cleanup: only our own objects (first path
        // segment must be the caller). External URLs are skipped by
        // parseStoredUrl; another user's objects are skipped by the segment
        // check + owner-scoped RLS. Matches the media route's cleanup pattern.
        for (const a of attachments ?? []) {
          const stored = parseStoredUrl(a.url);
          if (stored && stored.key.split("/")[0] === user.id) {
            await supabase.storage.from(stored.bucket).remove([stored.key]);
          }
        }
        return jsonOk({ ok: true });
      }
      case "react": {
        const emoji = sanitizeText(String(body.emoji ?? ""), 16);
        if (!emoji) return jsonError(400, "bad_request");
        const { data: existing } = await supabase
          .from("message_reactions")
          .select("message_id")
          .eq("message_id", id)
          .eq("user_id", user.id)
          .eq("emoji", emoji)
          .maybeSingle();
        if (existing) {
          await supabase
            .from("message_reactions")
            .delete()
            .eq("message_id", id)
            .eq("user_id", user.id)
            .eq("emoji", emoji);
        } else {
          await supabase.from("message_reactions").insert({
            message_id: id,
            user_id: user.id,
            emoji,
          });
        }
        return jsonOk({ ok: true });
      }
      case "read": {
        const { error } = await supabase.from("message_reads").upsert(
          { message_id: id, user_id: user.id, read_at: new Date().toISOString() },
          { onConflict: "message_id,user_id" },
        );
        if (error) return jsonError(500, "update_failed");
        const now = new Date().toISOString();
        await supabase
          .from("conversation_members")
          .update({ last_read_at: now })
          .eq("conversation_id", msg.conversation_id)
          .eq("user_id", user.id);
        return jsonOk({ ok: true });
      }
      case "report": {
        const { error } = await supabase.from("message_reports").insert({
          message_id: id,
          reporter_id: user.id,
          reason: sanitizeText(String(body.reason ?? ""), 500) || null,
        });
        if (error) return jsonError(500, "update_failed");
        return jsonOk({ ok: true });
      }
      default:
        return jsonError(400, "bad_request");
    }
  });
}