"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, MessageCircle, Pin, Volume2 } from "lucide-react";
import type { ConversationSummary } from "@/lib/messenger";
import { Avatar } from "./avatar";
import { MessageThread } from "./message-thread";
import { formatListTime } from "./time";

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
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversationId ?? null,
  );
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      // When opening a specific conversation, include archived ones so the
      // target thread is always available after getOrCreateConversation.
      const q = initialConversationId ? "?archived=1" : "";
      const res = await fetch(`/api/messenger/conversations${q}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [initialConversationId]);

  useEffect(() => {
    if (!userId) return;
    void load();
    let channel: { unsubscribe: () => void } | undefined;
    import("@/lib/supabase/client").then((mod) => {
      const client = mod.createClient();
      channel = client
        .channel(`messenger-list:${userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () =>
          void load(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "conversation_members" },
          (p) => {
            const row = p.new as { user_id?: string } | null;
            if (row && row.user_id === userId) void load();
          },
        )
        .subscribe();
    });
    return () => {
      channel?.unsubscribe();
    };
  }, [userId, load]);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const filtered = query
    ? conversations.filter((c) => displayName(c, userId).toLowerCase().includes(query.toLowerCase()))
    : conversations;

  return (
    <div className="grid h-full overflow-hidden rounded-2xl border bg-card md:grid-cols-[minmax(280px,360px)_1fr]">
      <aside className={active ? "hidden border-e md:flex md:flex-col" : "flex flex-col"}>
        <div className="flex items-center gap-2 border-b p-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search")}
              className="w-full rounded-full bg-muted py-2 pe-3 ps-9 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!loading && filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">{t("empty")}</div>
          )}
          {filtered.map((c) => {
            const name = displayName(c, userId);
            const isActive = c.id === activeId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={`flex w-full items-center gap-3 px-3 py-3 text-start transition-colors hover:bg-muted ${
                  isActive ? "bg-muted" : ""
                }`}
              >
                <Avatar
                  name={name}
                  src={peerOf(c, userId)?.avatar_url ?? null}
                  size="md"
                  online={undefined}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{name}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {c.last_message && formatListTime(c.last_message.created_at, t)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted-foreground">
                      {preview(c, userId, t)}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {c.pinned_at && <Pin className="h-3 w-3 text-muted-foreground" />}
                      {c.muted_until && <Volume2 className="h-3 w-3 text-muted-foreground" />}
                      {c.unread > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-background">
                          {c.unread > 99 ? "99+" : c.unread}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </button>
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

function displayName(c: ConversationSummary, me: string): string {
  if (c.title) return c.title;
  const peer = c.participants.find((p) => p.id !== me);
  return peer?.name ?? "Conversation";
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