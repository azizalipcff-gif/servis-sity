"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowLeft, Loader2, MessageCircle, RefreshCcw, WifiOff } from "lucide-react";
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import type { ConversationSummary } from "@/lib/messenger";
import type { Database } from "@/lib/supabase/database.types";
import { formatDayLabel } from "./time";
import { Avatar } from "./avatar";
import { MessageBubble, type ThreadMessage, type ReactionGroup } from "./message-bubble";
import { Composer, type ComposerPayload } from "./composer";
import { deriveReadByPeer } from "./message-utils";

type LiveReactions = Record<string, { emoji: string; user_id: string }[]>;

const LATENCY_DEBUG = process.env.NODE_ENV !== "production";
function latencyLog(...args: unknown[]) {
  if (!LATENCY_DEBUG) return;
  console.log("[latency]", performance.now().toFixed(0), ...args);
}

function buildMessage(
  m: ThreadMessage,
  reactions: LiveReactions,
  peerLastReadAt: string | null,
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
    readByPeer: deriveReadByPeer(m, peerLastReadAt, me),
    pending: m.pending ?? false,
    // GET resolves quoted bodies server-side without auth context; derive
    // the "You:" prefix here so reply previews survive reloads.
    reply: m.reply ? { ...m.reply, mine: m.reply.sender_id === me } : null,
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
  const locale = useLocale();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [liveReactions, setLiveReactions] = useState<LiveReactions>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [typing, setTyping] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  const [offline, setOffline] = useState(false);
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; sender_id: string; body: string } | null>(null);
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const [newBelow, setNewBelow] = useState(0);

  const peer = useMemo(
    () => conversation.participants.find((p) => p.id !== me),
    [conversation.participants, me],
  );
  const peerName = peer?.name ?? conversation.title ?? "…";
  // BUGFIX: this was `peerUserId` (a UUID) used as an <img src>, so every
  // avatar in the thread rendered broken. Use the profile's avatar_url.
  const peerAvatar = peer?.avatar_url ?? null;

  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(
    peer?.last_read_at ?? null,
  );

  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const initialScrolled = useRef(false);
  const prevHeight = useRef(0);
  const prevFirstId = useRef<string | null>(null);
  const prevCount = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const sendAtRef = useRef<number>(0);
  // Ids of messages loaded in THIS thread; guards the (unfiltered) reaction
  // subscriptions so events from other conversations are ignored.
  const messageIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    messageIdsRef.current = new Set(messages.map((m) => m.id));
  }, [messages]);
  /** per-message in-flight guard: blocks double-POST of the SAME message */
  const inFlight = useRef<Set<string>>(new Set());
  /** temp message id -> original payload, for retrying failed sends */
  const failedPayloads = useRef<Map<string, ComposerPayload>>(new Map());

  // Keep the latest callback without resubscribing realtime channels when
  // the parent re-renders and passes a new arrow function.
  const onChangedRef = useRef(onChanged);
  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);

  const scrollToBottom = useCallback((smooth: boolean) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    stickToBottom.current = true;
    setNewBelow(0);
  }, []);

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stickToBottom.current = nearBottom;
    if (nearBottom && newBelow > 0) setNewBelow(0);
  }

  const load = useCallback(
    async (before?: string) => {
      const t0 = performance.now();
      const q = new URLSearchParams({ conversationId: conversation.id, limit: "40" });
      if (before) q.set("before", before);
      try {
        const res = await fetch(`/api/messenger/messages?${q}`, { cache: "no-store" });
        latencyLog("thread.loadMs", `${Math.round(performance.now() - t0)}ms`, conversation.id);
        if (!res.ok) return null;
        return (await res.json()) as {
          messages: ThreadMessage[];
          reactions: LiveReactions;
        };
      } catch {
        return null;
      }
    },
    [conversation.id],
  );

  const refresh = useCallback(async () => {
    const data = await load();
    if (!data) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    setLoadError(false);
    setLiveReactions(data.reactions ?? {});
    setMessages(data.messages.map((m) => buildMessage(m, data.reactions ?? {}, peerLastReadAt, me)));
    setHasMore(data.messages.length === 40);
    setLoading(false);
    // Initial paint: pin to the newest message instantly (no smooth glide).
    requestAnimationFrame(() => {
      scrollToBottom(false);
      initialScrolled.current = true;
      prevHeight.current = scrollerRef.current?.scrollHeight ?? 0;
      prevFirstId.current = data.messages[0]?.id ?? null;
      prevCount.current = data.messages.length;
    });
  }, [load, me, peerLastReadAt, scrollToBottom]);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  // Preserve scroll position on prepend; follow new messages only when the
  // user is already at (or near) the bottom.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !initialScrolled.current) return;
    const height = el.scrollHeight;
    const firstId = messages[0]?.id ?? null;
    const prepended = messages.length > prevCount.current && firstId !== prevFirstId.current;
    const appended = messages.length > prevCount.current && !prepended;

    if (prepended) {
      // Loading older pages: keep the viewport anchored on the same content.
      el.scrollTop += height - prevHeight.current;
    } else if (appended) {
      if (stickToBottom.current) {
        scrollToBottom(true);
      } else {
        setNewBelow((n) => n + (messages.length - prevCount.current));
      }
    }
    prevHeight.current = height;
    prevFirstId.current = firstId;
    prevCount.current = messages.length;
  }, [messages, scrollToBottom]);

  const markAllRead = useCallback(async () => {
    await fetch("/api/messenger/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: conversation.id, action: "readAll" }),
    })
      .then(() => onChangedRef.current())
      .catch(() => {});
  }, [conversation.id]);

  useEffect(() => {
    if (conversation.unread > 0) void markAllRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Presence — track WHO is online (user ids), not how many browser tabs are
  // open. Two tabs of my own must not make the peer look online.
  useEffect(() => {
    let disposed = false;
    let client: SupabaseClient<Database> | null = null;
    let presence: RealtimeChannel | null = null;
    import("@/lib/supabase/client").then((mod) => {
      if (disposed) return;
      client = mod.createClient();
      presence = client
        .channel(`chat-online:${conversation.id}`)
        .on("presence", { event: "sync" }, () => {
          const state =
            (presence as unknown as { presenceState?: () => Record<string, { user_id?: string }[]> })
              .presenceState?.() ?? {};
          setPeerOnline(
            Object.values(state).some((entries) =>
              (entries ?? []).some((e) => e.user_id && e.user_id === peerUserId),
            ),
          );
        })
        .subscribe((status) => {
          latencyLog("presence.sub", status);
          if (status === "SUBSCRIBED") {
            void (presence as unknown as { track?: (p: unknown) => void }).track?.({
              user_id: me,
            });
          }
        });
    });
    return () => {
      disposed = true;
      if (client && presence) client.removeChannel(presence);
    };
  }, [conversation.id, me, peerUserId]);

  // Realtime messages / reactions / typing / peer read marker / connection.
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
            latencyLog("realtime.messages.insert", row.id, row.sender_id, conversation.id);
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
        // message_reactions has no conversation_id column; filtering on it
        // makes the Realtime subscription raise at join time, which kills
        // EVERY postgres_changes stream on this channel (messages, typing,
        // read markers). Subscribe unfiltered instead: delivery is still
        // scoped by reactions_select_member RLS (own conversations only),
        // and handlers ignore ids that are not part of this thread.
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "message_reactions" },
          (p) => {
            const row = p.new as { message_id: string; emoji: string; user_id: string } | null;
            if (!row || !messageIdsRef.current.has(row.message_id)) return;
            setLiveReactions((prev) => {
              const next = { ...prev, [row.message_id]: [...(prev[row.message_id] ?? [])] };
              next[row.message_id].push({ emoji: row.emoji, user_id: row.user_id });
              return next;
            });
          },
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "message_reactions" },
          (p) => {
            const row = p.old as { message_id: string; emoji: string; user_id: string } | null;
            if (!row || !messageIdsRef.current.has(row.message_id)) return;
            setLiveReactions((prev) => ({
              ...prev,
              [row.message_id]: (prev[row.message_id] ?? []).filter(
                (r) => !(r.user_id === row.user_id && r.emoji === row.emoji),
              ),
            }));
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
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "conversation_members", filter: `conversation_id=eq.${conversation.id}` },
          (p) => {
            const row = p.new as { user_id: string; last_read_at: string } | null;
            if (row && row.user_id !== me && row.last_read_at) {
              setPeerLastReadAt(row.last_read_at);
            }
          },
        )
        .subscribe((status) => {
          latencyLog("chat.sub", status);
          // Connection chip: only surface problems, stay quiet when healthy.
          setOffline(status !== "SUBSCRIBED");
        });
    });
    return () => {
      disposed = true;
      if (client && channel) client.removeChannel(channel);
    };
  }, [conversation.id, me, markAllRead]);

  // peerLastReadAt changes must re-derive ✓✓ on all my messages.
  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) =>
        m.sender_id === me
          ? { ...m, readByPeer: deriveReadByPeer(m, peerLastReadAt, me) }
          : m,
      ),
    );
  }, [peerLastReadAt, me]);

  const loadOlder = async () => {
    const oldest = messages[0]?.created_at;
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    const data = await load(oldest);
    if (data) {
      const more = data.messages
        .filter((m) => !messages.some((x) => x.id === m.id))
        .map((m) => buildMessage(m, { ...liveReactions, ...(data.reactions ?? {}) }, peerLastReadAt, me));
      setLiveReactions((prev) => ({ ...(data.reactions ?? {}), ...prev }));
      setMessages((prev) => [...more, ...prev]);
      setHasMore(data.messages.length === 40);
    }
    setLoadingOlder(false);
  };

  /** Typing indicator, debounced: at most one "typing" POST every 2s. */
  function sendTyping() {
    const now = Date.now();
    if (now - lastTypingSent.current >= 2000) {
      lastTypingSent.current = now;
      void fetch("/api/messenger/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversation.id, isTyping: true }),
      }).catch(() => {});
    }
    if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
    stopTypingTimer.current = setTimeout(() => {
      void fetch("/api/messenger/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversation.id, isTyping: false }),
      }).catch(() => {});
    }, 2500);
  }

  async function postMessage(payload: ComposerPayload, tempId: string) {
    if (inFlight.current.has(tempId)) return;
    inFlight.current.add(tempId);
    setSending(true);
    sendAtRef.current = performance.now();
    latencyLog("send.start", conversation.id);
    try {
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
      latencyLog("send.apiMs", `${Math.round(performance.now() - sendAtRef.current)}ms`, conversation.id);
      if (res.ok) {
        const json = await res.json();
        failedPayloads.current.delete(tempId);
        setMessages((prev) =>
          prev.map((x) =>
            x.id === tempId
              ? { ...(json.message as ThreadMessage), pending: false, failed: false, reply: x.reply }
              : x,
          ),
        );
      } else {
        const data = await res.json().catch(() => ({}));
        if ((data as { error?: string }).error === "blocked") onChangedRef.current();
        setMessages((prev) =>
          prev.map((x) => (x.id === tempId ? { ...x, pending: false, failed: true } : x)),
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((x) => (x.id === tempId ? { ...x, pending: false, failed: true } : x)),
      );
    } finally {
      inFlight.current.delete(tempId);
      setSending(false);
    }
  }

  async function handleSend(payload: ComposerPayload) {
    const sentAt = performance.now();
    sendAtRef.current = sentAt;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimistic: ThreadMessage = {
      id: tempId,
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
      reply:
        replyTo
          ? ({
              id: replyTo.id,
              sender_id: replyTo.sender_id,
              body: replyTo.body,
              mine: replyTo.sender_id === me,
            } as ThreadMessage["reply"])
          : null,
    };
    failedPayloads.current.set(tempId, payload);
    setMessages((prev) => [...prev, optimistic]);
    setReplyTo(null);
    // My own send always brings the thread back to the newest message.
    requestAnimationFrame(() => scrollToBottom(true));
    await postMessage(payload, tempId);
  }

  function handleRetry(tempId: string) {
    const msg = messages.find((m) => m.id === tempId);
    const payload = failedPayloads.current.get(tempId);
    if (!msg || !payload) return;
    setMessages((prev) =>
      prev.map((x) => (x.id === tempId ? { ...x, pending: true, failed: false } : x)),
    );
    void postMessage(payload, tempId);
  }

  function onComposerSend(p: ComposerPayload) {
    if (editing) {
      const target = editing;
      void fetch("/api/messenger/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id, action: "edit", body: p.body }),
      });
      // Apply locally immediately; realtime echoes the same state to the peer.
      setMessages((prev) =>
        prev.map((x) =>
          x.id === target.id ? { ...x, body: p.body, edited_at: new Date().toISOString() } : x,
        ),
      );
      setEditing(null);
      setValue("");
      return;
    }
    void handleSend({ ...p, replyTo: replyTo?.id ?? p.replyTo });
  }

  function handleAction(a: { type: string; emoji?: string }, msg: ThreadMessage) {
    if (a.type === "retry") {
      handleRetry(msg.id);
      return;
    }
    if (a.type === "reply") {
      setReplyTo({
        id: msg.id,
        sender_id: msg.sender_id,
        body: msg.type === "text" || msg.type === "emoji" ? msg.body : msg.type,
      });
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
      // Tombstone immediately; the UPDATE echo confirms for the peer.
      setMessages((prev) =>
        prev.map((x) =>
          x.id === msg.id
            ? { ...x, deleted_at: new Date().toISOString(), body: "", attachment_url: null }
            : x,
        ),
      );
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

  const biz = conversation.business;

  return (
    <div className="relative flex h-full flex-col">
      <header className="flex items-center gap-3 border-b px-3 py-2.5">
        <button type="button" onClick={onBack} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted md:hidden" aria-label="back">
          <ArrowLeft className="h-5 w-5 rtl:-scale-x-100" />
        </button>
        <Avatar
          name={biz?.name ?? peerName}
          src={biz?.logo_url ?? peerAvatar}
          size="md"
          online={biz ? undefined : peerOnline || undefined}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{biz?.name ?? peerName}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {biz
              ? [
                  biz.city
                    ? biz.city[locale as keyof typeof biz.city] ?? null
                    : null,
                  typing ? t("typing") : peerOnline ? t("online") : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || t("offline")
              : typing
                ? t("typing")
                : peerOnline
                  ? t("online")
                  : t("offline")}
          </p>
        </div>
      </header>

      <div
        className="relative flex-1 overflow-y-auto pb-2 pt-3"
        ref={scrollerRef}
        onScroll={onScroll}
      >
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && loadError && (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <WifiOff className="h-6 w-6 opacity-60" />
            <p>{t("loadFailed")}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setLoadError(false);
                void refresh();
              }}
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted"
            >
              <RefreshCcw className="h-3 w-3" /> {t("retry")}
            </button>
          </div>
        )}
        {!loading && !loadError && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 pb-16 text-center text-muted-foreground">
            <MessageCircle className="h-10 w-10 opacity-40" />
            <p className="text-sm">{t("startConversation")}</p>
            <p className="text-xs opacity-70">{t("emptyThreadHint")}</p>
          </div>
        )}
        {!loading && hasMore && messages.length > 0 && (
          <div className="flex justify-center py-2">
            <button type="button" onClick={() => void loadOlder()} className="text-xs text-muted-foreground underline hover:text-foreground">
              {loadingOlder ? <Loader2 className="h-3 w-3 animate-spin" /> : t("loadEarlier")}
            </button>
          </div>
        )}
        {grouped.map((group) => (
          <div key={group.key}>
            <div className="my-3 flex justify-center">
              <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground" suppressHydrationWarning>
                {formatDayLabel(group.items[0]?.created_at ?? "", (k) => t(k), locale)}
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

      {/* Jump-to-newest pill while reading history */}
      {newBelow > 0 && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-24 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg"
        >
          <ArrowDown className="h-3.5 w-3.5 rtl:-scale-x-100" />
          {t("newMessages")}
        </button>
      )}

      {offline && (
        <div className="flex items-center justify-center gap-2 border-t bg-muted/60 px-3 py-1 text-[11px] text-muted-foreground">
          <WifiOff className="h-3 w-3" />
          {t("reconnecting")}
        </div>
      )}

      <Composer
        me={me}
        disabled={loading || loadError}
        sending={sending}
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
