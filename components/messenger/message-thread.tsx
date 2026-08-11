"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import type { ConversationSummary } from "@/lib/messenger";
import type { Database } from "@/lib/supabase/database.types";
import { formatDayLabel } from "./time";
import { Avatar } from "./avatar";
import { MessageBubble, type ThreadMessage, type ReactionGroup } from "./message-bubble";
import { Composer, type ComposerPayload } from "./composer";

type LiveReactions = Record<string, { emoji: string; user_id: string }[]>;
type LiveReads = Record<string, string[]>;

function buildMessage(
  m: ThreadMessage,
  reactions: LiveReactions,
  reads: LiveReads,
  me: string,
): ThreadMessage {
  const groups = (reactions[m.id] ?? []).reduce<ReactionGroup[]>((acc, r) => {
    const g = acc.find((x) => x.emoji === r.emoji);
    if (g) {
      g.count += 1;
      if (r.user_id === me) g.mine = true;
    } else {
      acc.push({ emoji: r.emoji, count: 1, mine: r.user_id === me });
    }
    return acc;
  }, []);
  return {
    ...m,
    reactions: groups.length ? groups : undefined,
    readByPeer: m.sender_id === me && (reads[m.id] ?? []).length > 0,
    pending: m.pending ?? false,
  };
}

export function MessageThread({
  conversation,
  me,
  peerUserId,
  onBack,
  onChanged,
}: {
  conversation: ConversationSummary;
  me: string;
  peerUserId: string | null;
  onBack: () => void;
  onChanged: () => void;
}) {
  const t = useTranslations("messenger");
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [typing, setTyping] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  const [value, setValue] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; sender_id: string; body: string } | null>(null);
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const peerName = conversation.title ?? "…";
  const peerAvatar = peerUserId ?? null;

  const load = useCallback(
    async (before?: string) => {
      const q = new URLSearchParams({ conversationId: conversation.id, limit: "40" });
      if (before) q.set("before", before);
      const res = await fetch(`/api/messenger/messages?${q}`, { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as {
        messages: ThreadMessage[];
        reactions: LiveReactions;
        reads: LiveReads;
      };
    },
    [conversation.id],
  );

  const refresh = useCallback(async () => {
    const data = await load();
    if (!data) return;
    setMessages(data.messages.map((m) => buildMessage(m, data.reactions, data.reads, me)));
    setHasMore(data.messages.length === 40);
    setLoading(false);
  }, [load, me]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    await fetch("/api/messenger/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: conversation.id, action: "readAll" }),
    }).catch(() => {});
  }, [conversation.id]);

  useEffect(() => {
    if (conversation.unread > 0) void markAllRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
  }, [messages.length, typing]);

  // Presence
  useEffect(() => {
    // Same disposed-guard pattern as the messages effect: never attach
    // callbacks to a channel instance that a previous effect run already
    // subscribed (createClient() is memoized, .channel(name) dedupes by name).
    let disposed = false;
    let client: SupabaseClient<Database> | null = null;
    let presence: RealtimeChannel | null = null;
    import("@/lib/supabase/client").then((mod) => {
      if (disposed) return;
      client = mod.createClient();
      presence = client
        .channel(`chat-online:${conversation.id}`)
        .on("presence", { event: "sync" }, () => {
          const state = (presence as unknown as { presenceState?: () => Record<string, unknown> })
            .presenceState?.() ?? {};
          setPeerOnline(Object.keys(state).length > 1);
        })
        .on("presence", { event: "join" }, () => setPeerOnline(true))
        .on("presence", { event: "leave" }, () => {
          const state = (presence as unknown as { presenceState?: () => Record<string, unknown> })
            .presenceState?.() ?? {};
          setPeerOnline(Object.keys(state).length > 1);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            void (presence as unknown as { track?: (p: unknown) => void }).track?.({ v: Date.now() });
          }
        });
    });
    return () => {
      disposed = true;
      if (client && presence) client.removeChannel(presence);
    };
  }, [conversation.id]);

  // Realtime messages / reactions / reads / typing
  useEffect(() => {
    let disposed = false;
    let client: SupabaseClient<Database> | null = null;
    let channel: RealtimeChannel | null = null;
    import("@/lib/supabase/client").then((mod) => {
      if (disposed) return;
      client = mod.createClient();
      channel = client
        .channel(`chat:${conversation.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversation.id}` },
          (p) => {
            const row = p.new as ThreadMessage;
            if (row.sender_id !== me) {
              setMessages((prev) => {
                if (prev.some((x) => x.id === row.id)) return prev;
                return [...prev, { ...row, pending: false }];
              });
              void markAllRead();
            } else {
              setMessages((prev) =>
                prev.map((x) => (x.id === row.id ? { ...row, pending: false } : x)),
              );
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversation.id}` },
          (p) => {
            const row = p.new as ThreadMessage;
            setMessages((prev) =>
              prev.map((x) =>
                x.id === row.id
                  ? { ...row, reactions: x.reactions, pending: x.pending, readByPeer: x.readByPeer }
                  : x,
              ),
            );
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "message_reactions", filter: `conversation_id=eq.${conversation.id}` },
          () => void refresh(),
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "message_reads", filter: `user_id=neq.${me}` },
          (p) => {
            const row = p.new as { message_id: string } | null;
            if (row) {
              setMessages((prev) =>
                prev.map((x) => (x.id === row.message_id ? { ...x, readByPeer: true } : x)),
              );
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "typing_status", filter: `conversation_id=eq.${conversation.id}` },
          (p) => {
            const row = p.new as { user_id: string; is_typing: boolean } | null;
            if (row && row.user_id !== me) {
              if (row.is_typing) {
                setTyping(true);
                if (typingTimer.current) clearTimeout(typingTimer.current);
                typingTimer.current = setTimeout(() => setTyping(false), 3000);
              } else {
                setTyping(false);
              }
            }
          },
        )
        .subscribe();
    });
    return () => {
      disposed = true;
      if (client && channel) client.removeChannel(channel);
    };
  }, [conversation.id, me, refresh, markAllRead]);

  const loadOlder = async () => {
    const oldest = messages[0]?.created_at;
    if (!oldest) return;
    setLoadingOlder(true);
    const data = await load(oldest);
    if (data) {
      const more = data.messages
        .filter((m) => !messages.some((x) => x.id === m.id))
        .map((m) => buildMessage(m, data.reactions, data.reads, me));
      setMessages((prev) => [...more, ...prev]);
      setHasMore(data.messages.length === 40);
    }
    setLoadingOlder(false);
  };

  function sendTyping() {
    void fetch("/api/messenger/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: conversation.id, isTyping: true }),
    }).catch(() => {});
    if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
    stopTypingTimer.current = setTimeout(() => {
      void fetch("/api/messenger/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversation.id, isTyping: false }),
      }).catch(() => {});
    }, 2500);
  }

  async function handleSend(payload: ComposerPayload) {
    const optimistic: ThreadMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversation.id,
      sender_id: me,
      type: payload.type,
      body: payload.type === "image" || payload.type === "file" ? payload.attachmentName ?? "" : payload.body,
      attachment_url: payload.attachmentUrl ?? null,
      reply_to: payload.replyTo ?? null,
      edited_at: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      pending: true,
      reply: replyTo && replyTo.sender_id !== "me" ? ({ body: replyTo.body, sender_id: replyTo.sender_id } as ThreadMessage) : null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setReplyTo(null);

    const res = await fetch("/api/messenger/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: conversation.id,
        type: payload.type,
        body: payload.body,
        attachmentUrl: payload.attachmentUrl,
        attachmentName: payload.attachmentName,
        attachmentMeta: payload.attachmentMeta,
        replyTo: payload.replyTo,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      setMessages((prev) =>
        prev.map((x) =>
          x.id === optimistic.id ? { ...(json.message as ThreadMessage), pending: false, reply: x.reply } : x,
        ),
      );
    } else {
      const data = await res.json().catch(() => ({}));
      if ((data as { error?: string }).error === "blocked") onChanged();
      setMessages((prev) => prev.filter((x) => x.id !== optimistic.id));
    }
  }

  function onComposerSend(p: ComposerPayload) {
    if (editing) {
      void fetch("/api/messenger/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, action: "edit", body: p.body }),
      }).then(() => {
        setEditing(null);
        setValue("");
      });
      return;
    }
    void handleSend({ ...p, replyTo: replyTo?.id ?? p.replyTo });
  }

  function handleAction(a: { type: string; emoji?: string }, msg: ThreadMessage) {
    if (a.type === "reply") {
      setReplyTo({ id: msg.id, sender_id: msg.sender_id, body: msg.type === "text" ? msg.body : msg.type });
      return;
    }
    if (a.type === "edit") {
      if (msg.type !== "text") return;
      setEditing({ id: msg.id, body: msg.body });
      setValue(msg.body);
      return;
    }
    if (a.type === "react") {
      void fetch("/api/messenger/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: msg.id, action: "react", emoji: a.emoji }),
      }).catch(() => {});
      return;
    }
    if (a.type === "delete") {
      void fetch("/api/messenger/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: msg.id, action: "unsend" }),
      });
      if (editing?.id === msg.id) {
        setEditing(null);
        setValue("");
      }
      return;
    }
    if (a.type === "report") {
      void fetch("/api/messenger/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: msg.id, action: "report", reason: "" }),
      });
      return;
    }
  }

  const grouped = useMemo(() => {
    const out: { key: string; items: ThreadMessage[] }[] = [];
    for (const m of messages) {
      const day = new Date(m.created_at).toDateString();
      const last = out[out.length - 1];
      if (last && last.key === day) last.items.push(m);
      else out.push({ key: day, items: [m] });
    }
    return out;
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b px-3 py-2.5">
        <button type="button" onClick={onBack} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted md:hidden" aria-label="back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar name={peerName} src={peerAvatar} size="md" online={peerOnline || undefined} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{peerName}</p>
          <p className="text-[11px] text-muted-foreground">
            {typing ? t("typing") : peerOnline ? t("online") : t("offline")}
          </p>
        </div>
      </header>

      <div className="relative flex-1 overflow-y-auto pb-2 pt-3" ref={bottomRef}>
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && hasMore && (
          <div className="flex justify-center py-2">
            <button type="button" onClick={() => void loadOlder()} className="text-xs text-muted-foreground underline hover:text-foreground">
              {loadingOlder ? <Loader2 className="h-3 w-3 animate-spin" /> : t("loadEarlier")}
            </button>
          </div>
        )}
        {grouped.map((group) => (
          <div key={group.key}>
            <div className="my-3 flex justify-center">
              <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                {formatDayLabel(group.items[0]?.created_at ?? "", (k) => t(k))}
              </span>
            </div>
            {group.items.map((m, i) => {
              const showAvatar = group.items[i - 1]?.sender_id !== m.sender_id;
              return (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isMine={m.sender_id === me}
                  peerName={peerName}
                  peerAvatar={peerAvatar}
                  showAvatar={showAvatar}
                  onAction={(a) => handleAction(a, m)}
                />
              );
            })}
          </div>
        ))}
      </div>

      <Composer
        me={me}
        disabled={loading}
        value={value}
        onChange={setValue}
        editing={editing}
        replyTo={replyTo ? { sender_id: replyTo.sender_id, body: replyTo.body } : null}
        onCancelReply={() => setReplyTo(null)}
        onCancelEdit={() => {
          setEditing(null);
          setValue("");
        }}
        onSend={(p) => onComposerSend(p)}
        onTyping={sendTyping}
      />
    </div>
  );
}