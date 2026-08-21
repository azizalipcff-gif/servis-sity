"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Archive,
  Loader2,
  MessageCircle,
  MoreVertical,
  Pin,
  RefreshCcw,
  Search,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import type { ConversationSummary } from "@/lib/messenger";
import type { Database } from "@/lib/supabase/database.types";
import { Avatar } from "./avatar";
import { MessageThread } from "./message-thread";
import { formatListTime } from "./time";

const LATENCY_DEBUG = process.env.NODE_ENV !== "production";
function latencyLog(...args: unknown[]) {
  if (!LATENCY_DEBUG) return;
  console.log("[latency]", performance.now().toFixed(0), ...args);
}

export function peerOf(c: ConversationSummary, me: string) {
  return c.participants.find((p) => p.id !== me);
}

export function MessengerClient({
  userId,
  initialConversationId,
}: {
  userId: string;
  initialConversationId?: string;
}) {
  const t = useTranslations("messenger");
  const locale = useLocale();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversationId ?? null,
  );
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [menuForId, setMenuForId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const t0 = performance.now();
    try {
      // When opening a specific conversation, include archived ones so the
      // target thread is always available after getOrCreateConversation.
      const q = initialConversationId ? "?archived=1" : "";
      const res = await fetch(`/api/messenger/conversations${q}`, { cache: "no-store" });
      if (!res.ok) throw new Error("list_failed");
      const data = await res.json();
      setConversations(data.conversations ?? []);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    } finally {
      latencyLog("list.loadMs", `${Math.round(performance.now() - t0)}ms`);
      setLoading(false);
    }
  }, [initialConversationId]);

  // Coalesce realtime bursts into one trailing refetch instead of one HTTP
  // request per event (the messages INSERT subscription is intentionally
  // unfiltered — RLS already scopes rows to my conversations).
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttledLoad = useCallback(() => {
    if (reloadTimer.current) return;
    reloadTimer.current = setTimeout(() => {
      reloadTimer.current = null;
      void load();
    }, 700);
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    void load();

    // Guard against stale subscriptions leaked by async registration.
    // createClient() memoizes the client and .channel(name) returns the same
    // channel for a given name; under StrictMode a second effect run must never
    // attach postgres_changes to an already-subscribed channel, which throws
    // "cannot add postgres_changes callbacks after subscribe()".
    let disposed = false;
    let client: SupabaseClient<Database> | null = null;
    let channel: RealtimeChannel | null = null;

    import("@/lib/supabase/client").then((mod) => {
      if (disposed) return;
      client = mod.createClient();
      channel = client
        .channel(`messenger-list:${userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
          latencyLog("list.messages.insert");
          throttledLoad();
        })
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "conversation_members" },
          (p) => {
            const row = p.new as { user_id?: string } | null;
            if (row && row.user_id === userId) throttledLoad();
          },
        )
        .subscribe();
    });

    return () => {
      disposed = true;
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      if (client && channel) client.removeChannel(channel);
    };
  }, [userId, load, throttledLoad]);

  async function memberAction(conversationId: string, action: string) {
    setMenuForId(null);
    try {
      await fetch(`/api/messenger/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    } catch {
      /* best-effort */
    }
    void load();
  }

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const filtered = query
    ? conversations.filter((c) => matches(c, userId, query))
    : conversations;

  return (
    <div className="grid h-full overflow-hidden rounded-2xl border bg-card md:grid-cols-[minmax(280px,360px)_1fr]">
      {menuForId && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => setMenuForId(null)}
          className="fixed inset-0 z-10 cursor-default"
        />
      )}
      <aside className={active ? "hidden border-e md:flex md:flex-col" : "flex flex-col"}>
        <div className="flex items-center gap-2 border-b p-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search")}
              aria-label={t("search")}
              className="w-full rounded-full bg-muted py-2 pe-3 ps-9 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && loadFailed && (
            <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
              <p>{t("loadFailed")}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setLoadFailed(false);
                  void load();
                }}
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted"
              >
                <RefreshCcw className="h-3 w-3" /> {t("retry")}
              </button>
            </div>
          )}
          {!loading && !loadFailed && filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">{t("empty")}</div>
          )}
          {filtered.map((c) => {
            const name = displayName(c, userId);
            const isActive = c.id === activeId;
            const mutedActive = Boolean(c.muted_until && new Date(c.muted_until) > new Date());
            return (
              <div
                key={c.id}
                className={`relative flex w-full items-center gap-1 px-1 transition-colors hover:bg-muted ${
                  isActive ? "bg-muted" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 px-2 py-3 text-start"
                >
                  <Avatar
                    name={name}
                    src={c.business?.logo_url ?? peerOf(c, userId)?.avatar_url ?? null}
                    size="md"
                    online={undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{name}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground" suppressHydrationWarning>
                        {c.last_message && formatListTime(c.last_message.created_at, t, locale)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">
                        {preview(c, userId, t)}
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        {c.pinned_at && <Pin className="h-3 w-3 text-muted-foreground" />}
                        {mutedActive && <VolumeX className="h-3 w-3 text-muted-foreground" />}
                        {c.unread > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-background">
                            {c.unread > 99 ? "99+" : c.unread}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </button>
                <div className="relative shrink-0 self-start pt-3">
                  <button
                    type="button"
                    aria-label={t("profile")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuForId(menuForId === c.id ? null : c.id);
                    }}
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-background"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {menuForId === c.id && (
                    <div className="absolute end-2 top-10 z-20 flex w-40 flex-col gap-0.5 rounded-xl border bg-card p-1 text-sm shadow-lg">
                      <MenuItem onClick={() => void memberAction(c.id, c.pinned_at ? "unpin" : "pin")}>
                        <Pin className="h-4 w-4" /> {c.pinned_at ? t("unpin") : t("pinToTop")}
                      </MenuItem>
                      <MenuItem onClick={() => void memberAction(c.id, mutedActive ? "unmute" : "mute")}>
                        {mutedActive ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                        {mutedActive ? t("unmute") : t("mute")}
                      </MenuItem>
                      <MenuItem onClick={() => void memberAction(c.id, "archive")}>
                        <Archive className="h-4 w-4" /> {t("archive")}
                      </MenuItem>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      <section className={`h-full ${active ? "" : "hidden md:block"}`}>
        {active ? (
          <MessageThread
            key={active.id}
            conversation={active}
            me={userId}
            peerUserId={peerOf(active, userId)?.id ?? null}
            onBack={() => setActiveId(null)}
            onChanged={() => load()}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 opacity-40" />
            <p className="text-sm">{t("selectConversation")}</p>
          </div>
        )}
      </section>
    </div>
  );
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-start hover:bg-muted"
    >
      {children}
    </button>
  );
}

function displayName(c: ConversationSummary, me: string): string {
  if (c.title) return c.title;
  const peer = c.participants.find((p) => p.id !== me);
  return peer?.name ?? "Conversation";
}

/** Search matches display name AND participant usernames/names. */
function matches(c: ConversationSummary, me: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (displayName(c, me).toLowerCase().includes(q)) return true;
  return c.participants.some(
    (p) =>
      p.id !== me &&
      ((p.username ?? "").toLowerCase().includes(q) ||
        (p.name ?? "").toLowerCase().includes(q)),
  );
}

function preview(
  c: ConversationSummary,
  me: string,
  t: (k: string) => string,
): string {
  const m = c.last_message;
  if (!m) return "";
  const who = m.sender_id && m.sender_id !== me ? "" : `${t("you")}: `;
  if (m.deleted_at) return `${who}${t("messageDeleted")}`;
  if (m.type === "image") return `${who}${t("image")}`;
  if (m.type === "voice") return `${who}${t("voice")}`;
  if (m.type === "file") return `${who}${t("file")}`;
  return `${who}${m.body}`;
}
