import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const PROFILE_SELECT = "id,full_name,avatar_url,username,city" as const;

export type ChatParticipant = {
  id: string;
  name: string;
  avatar_url: string | null;
  username: string | null;
  city: string | null;
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

/** Latest message per conversation (first match per conversation in desc order). */
export async function getLatestMessages(
  supabase: Sbc,
  conversationIds: string[],
): Promise<Record<string, MessageLite>> {
  const out: Record<string, MessageLite> = {};
  if (!conversationIds.length) return out;
  const { data } = await supabase
    .from("messages")
    .select("*")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false })
    .limit(500);
  data?.forEach((m) => {
    if (!out[m.conversation_id]) out[m.conversation_id] = m as MessageLite;
  });
  return out;
}

/** Unread count per conversation (messages after my last read, not from me). */
export async function getUnreadCounts(
  supabase: Sbc,
  me: string,
  memberships: Record<string, ChatMemberState>,
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const [conversationId, mem] of Object.entries(memberships)) {
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", me)
      .gt("created_at", mem.last_read_at)
      .is("deleted_at", null);
    out[conversationId] = count ?? 0;
  }
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
  const { data } = await supabase
    .from("conversation_members")
    .select(`conversation_id,user_id,profiles:user_id(${PROFILE_SELECT})`)
    .in("conversation_id", conversationIds);
  type ProfRow = {
    conversation_id: string;
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
  const latest = await getLatestMessages(supabase, conversationIds);
  const unread = await getUnreadCounts(supabase, me, myMem);
  const participants = await getParticipants(supabase, conversationIds);

  const result: ConversationSummary[] = (convs ?? []).map((c) => {
    const mem = myMem[c.id];
    return {
      id: c.id,
      type: c.type,
      title: c.title,
      business_id: c.business_id,
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

  const { data: conv } = await supabase
    .from("conversations")
    .insert({
      type,
      business_id: businessId,
      title,
      created_by: me,
    })
    .select("*")
    .single();
  if (!conv) return { id: null, conversation: null, error: "create_failed" };

  const { error: insErr } = await supabase.from("conversation_members").insert([
    { conversation_id: conv.id, user_id: me },
    { conversation_id: conv.id, user_id: peerId },
  ]);
  if (insErr) return { id: null, conversation: null, error: "create_failed" };

  return { id: conv.id, conversation: conv, error: null };
}

async function findExistingConversation(
  supabase: Sbc,
  me: string,
  peerId: string | null,
  businessId: string | null,
): Promise<string | null> {
  const { data: mine } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", me);
  const ids = mine?.map((m) => m.conversation_id) ?? [];
  if (!ids.length) return null;

  const { data: convs } = await supabase
    .from("conversations")
    .select("id,business_id")
    .in("id", ids);

  for (const c of convs ?? []) {
    if (businessId) {
      if (c.business_id === businessId) return c.id;
      continue;
    }
    if (c.business_id) continue;
    const { data: members } = await supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", c.id);
    if (peerId && members?.some((m) => m.user_id === peerId)) return c.id;
  }
  return null;
}