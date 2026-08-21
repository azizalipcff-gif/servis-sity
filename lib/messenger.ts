import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { randomUUID } from "node:crypto";
import { logError } from "@/lib/security/logger";

export const PROFILE_SELECT = "id,full_name,avatar_url,username,city" as const;

export type ChatParticipant = {
  id: string;
  name: string;
  avatar_url: string | null;
  username: string | null;
  city: string | null;
  /** The participant's own read marker in this conversation (drives ✓✓). */
  last_read_at: string | null;
};

export type MessageLite = {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: string;
  body: string;
  attachment_url: string | null;
  reply_to: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

export type ConversationSummary = {
  id: string;
  type: string;
  title: string | null;
  business_id: string | null;
  /** Business context for the thread header (logo, localized city). */
  business: {
    id: string;
    name: string;
    logo_url: string | null;
    city: { en: string; fr: string; ar: string } | null;
  } | null;
  updated_at: string;
  last_read_at: string;
  pinned_at: string | null;
  muted_until: string | null;
  archived_at: string | null;
  last_message: MessageLite | null;
  unread: number;
  participants: ChatParticipant[];
};

type Sbc = SupabaseClient<Database>;

/** My own membership rows keyed by conversation id. */
export async function getMyMemberships(
  supabase: Sbc,
  me: string,
  conversationIds: string[],
): Promise<Record<string, ChatMemberState>> {
  const out: Record<string, ChatMemberState> = {};
  if (!conversationIds.length) return out;
  const { data } = await supabase
    .from("conversation_members")
    .select("conversation_id,last_read_at,pinned_at,muted_until,archived_at")
    .eq("user_id", me)
    .in("conversation_id", conversationIds);
  data?.forEach((m) => {
    out[m.conversation_id] = {
      last_read_at: m.last_read_at,
      pinned_at: m.pinned_at,
      muted_until: m.muted_until,
      archived_at: m.archived_at,
    };
  });
  return out;
}

export type ChatMemberState = {
  last_read_at: string;
  pinned_at: string | null;
  muted_until: string | null;
  archived_at: string | null;
};

/** Latest message per conversation — one DISTINCT ON query via RPC. */
export async function getLatestMessages(
  supabase: Sbc,
): Promise<Record<string, MessageLite>> {
  const out: Record<string, MessageLite> = {};
  const { data, error } = await supabase.rpc("messenger_latest_messages");
  if (error) {
    logError("messenger.getLatestMessages", error);
    return out;
  }
  data?.forEach((m) => {
    out[m.conversation_id] = m as MessageLite;
  });
  return out;
}

/** Unread count per conversation — one query via RPC (was an N+1 loop). */
export async function getUnreadCounts(
  supabase: Sbc,
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const { data, error } = await supabase.rpc("messenger_unread_counts");
  if (error) {
    logError("messenger.getUnreadCounts", error);
    return out;
  }
  data?.forEach((row) => {
    out[row.conversation_id] = Number(row.unread ?? 0);
  });
  return out;
}

/** Participants with profile data keyed by conversation id. */
export async function getParticipants(
  supabase: Sbc,
  conversationIds: string[],
): Promise<Record<string, ChatParticipant[]>> {
  const out: Record<string, ChatParticipant[]> = {};
  if (!conversationIds.length) return out;
  conversationIds.forEach((cid) => (out[cid] = []));

  // Preferred path: security-definer RPC. profiles RLS is own-row-only, so a
  // plain embed under the caller's JWT can never resolve PEER profiles.
  const rpc = await supabase.rpc("messenger_participants", {
    conversation_ids: conversationIds,
  });
  if (!rpc.error && rpc.data) {
    rpc.data.forEach((row) => {
      out[row.conversation_id].push({
        id: row.user_id,
        name: row.full_name || row.username || row.user_id,
        avatar_url: row.avatar_url,
        username: row.username,
        city: row.city,
        last_read_at: row.last_read_at,
      });
    });
    return out;
  }
  if (rpc.error) logError("messenger.getParticipants", rpc.error);

  // Fallback for databases without the RPC (pre-0035): embed works for the
  // caller's own row; peer rows resolve only where profiles RLS allows.
  const { data } = await supabase
    .from("conversation_members")
    .select(`conversation_id,user_id,last_read_at,profiles:user_id(${PROFILE_SELECT})`)
    .in("conversation_id", conversationIds);
  type ProfRow = {
    conversation_id: string;
    user_id: string;
    last_read_at: string | null;
    profiles?: {
      id: string;
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
      city: string | null;
    } | null;
  };
  ((data ?? []) as unknown as ProfRow[]).forEach((row) => {
    const pf = row.profiles;
    if (!pf) return;
    out[row.conversation_id].push({
      id: pf.id,
      name: pf.full_name || pf.username || pf.id,
      avatar_url: pf.avatar_url,
      username: pf.username,
      city: pf.city,
      last_read_at: row.last_read_at,
    });
  });
  return out;
}

/** Full conversation summary list for the current user. */
export async function listConversations(
  supabase: Sbc,
  me: string,
  includeArchived = false,
): Promise<ConversationSummary[]> {
  let q = supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", me);
  if (!includeArchived) q = q.is("archived_at", null);
  const { data: memberships } = await q;
  if (!memberships?.length) return [];

  const conversationIds = memberships.map((m) => m.conversation_id);
  const { data: convs } = await supabase
    .from("conversations")
    .select("*")
    .in("id", conversationIds);

  const myMem = await getMyMemberships(supabase, me, conversationIds);
  const latest = await getLatestMessages(supabase);
  const unread = await getUnreadCounts(supabase);
  const participants = await getParticipants(supabase, conversationIds);

  // Business context for the thread header (logo + localized city).
  const businessIds = [...new Set((convs ?? []).map((c) => c.business_id).filter(Boolean))] as string[];
  type BizCtx = {
    name: string;
    logo_url: string | null;
    city: { en: string; fr: string; ar: string } | null;
  };
  const bizById: Record<string, BizCtx> = {};
  if (businessIds.length) {
    const { data: bizRows } = await supabase
      .from("businesses")
      .select("id,name,logo_url,city")
      .in("id", businessIds);
    const slugs = [...new Set((bizRows ?? []).map((b) => b.city).filter(Boolean))] as string[];
    const bySlug: Record<string, { en: string; fr: string; ar: string }> = {};
    if (slugs.length) {
      const { data: cityRows } = await supabase
        .from("cities")
        .select("slug,name_en,name_fr,name_ar")
        .in("slug", slugs);
      cityRows?.forEach((c) => {
        bySlug[c.slug] = { en: c.name_en, fr: c.name_fr, ar: c.name_ar };
      });
    }
    bizRows?.forEach((b) => {
      bizById[b.id] = {
        name: b.name,
        logo_url: b.logo_url,
        city: b.city ? bySlug[b.city] ?? null : null,
      };
    });
  }

  const result: ConversationSummary[] = (convs ?? []).map((c) => {
    const mem = myMem[c.id];
    const bizRow = c.business_id ? bizById[c.business_id] : undefined;
    return {
      id: c.id,
      type: c.type,
      title: c.title,
      business_id: c.business_id,
      business: bizRow
        ? { id: c.business_id!, ...bizRow }
        : null,
      updated_at: c.updated_at,
      last_read_at: mem?.last_read_at ?? new Date(0).toISOString(),
      pinned_at: mem?.pinned_at ?? null,
      muted_until: mem?.muted_until ?? null,
      archived_at: mem?.archived_at ?? null,
      last_message: latest[c.id] ?? null,
      unread: unread[c.id] ?? 0,
      participants: participants[c.id] ?? [],
    };
  });

  result.sort((a, b) => {
    if (a.pinned_at && !b.pinned_at) return -1;
    if (!a.pinned_at && b.pinned_at) return 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  return result;
}

/** Is the relationship between me and `other` blocked in either direction? */
export async function isBlocked(supabase: Sbc, me: string, other: string): Promise<boolean> {
  if (!other || other === me) return false;
  const { count: countA } = await supabase
    .from("blocked_users")
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", me)
    .eq("blocked_user_id", other);
  const { count: countB } = await supabase
    .from("blocked_users")
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", other)
    .eq("blocked_user_id", me);
  return (countA ?? 0) > 0 || (countB ?? 0) > 0;
}

export async function isConversationMember(
  supabase: Sbc,
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export type CreateConversationResult = {
  id: string | null;
  conversation: Record<string, unknown> | null;
  error: string | null;
};

function errorFields(err: unknown): {
  message: string | null;
  code: string | null;
  details: string | null;
  hint: string | null;
} {
  if (!err || typeof err !== "object") {
    return { message: err ? String(err) : null, code: null, details: null, hint: null };
  }
  const e = err as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
  const s = (v: unknown) => (v === null || v === undefined ? null : String(v));
  return {
    message: s(e.message),
    code: s(e.code),
    details: s(e.details),
    hint: s(e.hint),
  };
}

function logCreateFailed(
  stage: string,
  ctx: { me: string; peerId: string | null; businessId: string | null },
  err: unknown,
): void {
  const error = errorFields(err);
  console.error("[messenger] create conversation failed", { stage, ...ctx, error });
  logError(`messenger.getOrCreateConversation.${stage}`, err, { stage, ...ctx, error });
}

/** Get (or create) a private or business conversation. */
export async function getOrCreateConversation(
  supabase: Sbc,
  me: string,
  opts: { userId?: string; businessId?: string },
): Promise<CreateConversationResult> {
  let peerId: string | null = null;
  let type = "private";
  let businessId: string | null = null;
  let title: string | null = null;

  if (opts.businessId) {
    const { data: biz } = await supabase
      .from("businesses")
      .select("id,owner_id,name,status")
      .eq("id", opts.businessId)
      .maybeSingle();
    if (!biz) return { id: null, conversation: null, error: "not_found" };
    if (biz.owner_id === me) return { id: null, conversation: null, error: "self" };
    peerId = biz.owner_id;
    type = "business";
    businessId = biz.id;
    title = biz.name;
  } else {
    if (!opts.userId) return { id: null, conversation: null, error: "bad_request" };
    if (opts.userId === me) return { id: null, conversation: null, error: "self" };
    peerId = opts.userId;
  }

  const existing = await findExistingConversation(supabase, me, peerId, businessId);
  if (existing) return { id: existing, conversation: null, error: null };

  // Generate the id ourselves and insert WITHOUT `.select()`. The RLS SELECT
  // policy on conversations is `is_conversation_member(id)`, and the creator is
  // not a member until the membership rows below exist — so a single
  // `INSERT ... RETURNING` (what `.insert().select()` compiles to) aborts with
  // 42501 ("new row violates row-level security policy") on the RETURNING row.
  // Inserting without RETURNING and adding members afterwards sidesteps that.
  const convId = randomUUID();
  const { error: convErr } = await supabase.from("conversations").insert({
    id: convId,
    type,
    business_id: businessId,
    title,
    created_by: me,
  });
  if (convErr) {
    logCreateFailed("create", { me, peerId, businessId }, convErr);
    return { id: null, conversation: null, error: "create_failed" };
  }

  // Insert membership rows one at a time. The RLS policy members_insert_own only
  // lets a peer in if the creator is already a member; a single multi-row insert
  // evaluates every row against the statement-start snapshot, so the peer row
  // always fails. Inserting `me` first (allowed by user_id = auth.uid()) makes
  // the peer insert pass via the is_conversation_member branch.
  const { error: meErr } = await supabase
    .from("conversation_members")
    .insert({ conversation_id: convId, user_id: me });
  if (meErr) {
    logCreateFailed("members.me", { me, peerId, businessId }, meErr);
    return { id: null, conversation: null, error: "create_failed" };
  }

  const { error: peerErr } = await supabase
    .from("conversation_members")
    .insert({ conversation_id: convId, user_id: peerId });
  if (peerErr) {
    // 0034 trigger: a concurrent request created the same pair first. Reuse
    // the winner instead of failing, and clean up our half-built conversation.
    const msg = errorFields(peerErr).message ?? "";
    if (msg.includes("DUPLICATE_PRIVATE_CONVERSATION")) {
      void supabase.from("conversation_members").delete().eq("conversation_id", convId);
      void supabase.from("conversations").delete().eq("id", convId);
      const dup = await findExistingConversation(supabase, me, peerId, null);
      if (dup) return { id: dup, conversation: null, error: null };
    }
    logCreateFailed("members.peer", { me, peerId, businessId }, peerErr);
    return { id: null, conversation: null, error: "create_failed" };
  }

  return { id: convId, conversation: { id: convId } as Record<string, unknown>, error: null };
}

async function findExistingConversation(
  supabase: Sbc,
  me: string,
  peerId: string | null,
  businessId: string | null,
): Promise<string | null> {
  if (businessId) {
    // The partial unique index (0034) guarantees at most one per business.
    const { data } = await supabase
      .from("conversations")
      .select("id")
      .eq("business_id", businessId)
      .eq("type", "business")
      .limit(1);
    return data?.[0]?.id ?? null;
  }
  if (!peerId) return null;

  // One round-trip: private conversations containing BOTH users. PostgREST
  // embeds the member rows; we keep the conversation only when both ids are
  // present. (Was an N+1 loop with one members query per conversation.)
  const { data } = await supabase
    .from("conversations")
    .select("id,conversation_members(user_id)")
    .eq("type", "private")
    .is("business_id", null)
    .in("conversation_members.user_id", [me, peerId]);
  type Row = { id: string; conversation_members: { user_id: string }[] };
  const rows = (data ?? []) as unknown as Row[];
  const hit = rows.find((c) => {
    const ids = new Set(c.conversation_members.map((m) => m.user_id));
    return ids.has(me) && ids.has(peerId);
  });
  return hit?.id ?? null;
}