"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, CheckCheck, Reply, Trash2, Flag, Pencil, FileText, Mic } from "lucide-react";
import type { MessageLite } from "@/lib/messenger";
import { cn } from "@/lib/utils";
import { formatTime } from "./time";
import { Avatar } from "./avatar";
import { QUICK_EMOJI } from "./emoji";

export type ReactionGroup = { emoji: string; count: number; mine: boolean };

export type ThreadMessage = MessageLite & {
  reactions?: ReactionGroup[];
  readByPeer?: boolean;
  pending?: boolean;
  reply?: MessageLite | null;
};

export function MessageBubble({
  message,
  isMine,
  peerName,
  peerAvatar,
  showAvatar,
  onAction,
}: {
  message: ThreadMessage;
  isMine: boolean;
  peerName: string;
  peerAvatar: string | null;
  showAvatar: boolean;
  onAction: (action: { type: "react" | "reply" | "edit" | "delete" | "report"; emoji?: string }) => void;
}) {
  const t = useTranslations("messenger");
  const [menu, setMenu] = useState<"react" | "actions" | null>(null);

  const deleted = Boolean(message.deleted_at);

  return (
    <div
      className={cn("group flex w-full gap-2 px-3 py-0.5", isMine ? "justify-end" : "justify-start")}
    >
      {!isMine && (
        <div className="w-8 shrink-0">
          {showAvatar && <Avatar name={peerName} src={peerAvatar} size="sm" />}
        </div>
      )}
      <div className={cn("relative max-w-[78%] md:max-w-[65%]", isMine && "flex flex-col items-end")}>
        <div
          className={cn(
            "relative rounded-2xl px-3 py-2 text-sm shadow-sm",
            isMine
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm bg-muted",
            deleted && "opacity-60",
          )}
        >
          {deleted ? (
            <span className="italic">{t("messageDeleted")}</span>
          ) : message.type === "image" ? (
            <div className="-m-1 overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={message.attachment_url ?? ""}
                alt=""
                className="max-h-72 w-auto max-w-full object-cover"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            </div>
          ) : message.type === "voice" ? (
            <div className="flex items-center gap-2 py-1">
              <Mic className="h-4 w-4 opacity-70" />
              <audio src={message.attachment_url ?? undefined} controls preload="metadata" className="h-9 w-56 max-w-full" />
            </div>
          ) : message.type === "file" || message.type === "emoji" || message.type === "text" ? (
            message.attachment_url ? (
              <a
                href={message.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 underline underline-offset-2"
              >
                <FileText className="h-4 w-4" />
                <span>{message.body || t("file")}</span>
              </a>
            ) : (
              <span className={cn("whitespace-pre-wrap break-words", message.type === "emoji" && "text-3xl")}>
                {message.body}
              </span>
            )
          ) : (
            <span className="whitespace-pre-wrap break-words">{message.body}</span>
          )}
        </div>

        {message.reply && (
          <div
            className={cn(
              "mb-0.5 mt-1 max-w-full truncate rounded-lg px-3 py-1 text-xs opacity-80",
              isMine ? "bg-primary/20" : "bg-secondary",
            )}
          >
            {message.reply.body || (message.reply.type === "image" ? t("image") : t("file"))}
          </div>
        )}

        {reactions(message) && (
          <div
            className={cn(
              "-mt-2 flex flex-wrap gap-1 px-1",
              isMine ? "justify-end" : "justify-start",
            )}
          >
            {reactions(message)!.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onAction({ type: "react", emoji: r.emoji })}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition-colors",
                  r.mine ? "border-primary/50 bg-primary/10" : "border-border bg-card hover:bg-muted",
                )}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {menu === "react" && (
          <div className={cn("absolute -top-10 z-20 flex gap-1 rounded-full border bg-card p-1 shadow-lg", isMine ? "end-0" : "start-0")}>
            {QUICK_EMOJI.map((e) => (
              <button
                key={e}
                type="button"
                className="rounded-full p-1 text-lg transition-transform hover:scale-125"
                onClick={() => { onAction({ type: "react", emoji: e }); setMenu(null); }}
              >
                {e}
              </button>
            ))}
          </div>
        )}
        {menu === "actions" && (
          <div className={cn("absolute top-full z-20 mt-1 flex flex-col gap-0.5 rounded-xl border bg-card p-1 text-sm shadow-lg", isMine ? "end-0" : "start-0")}>
            <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-1 text-start hover:bg-muted" onClick={() => { onAction({ type: "reply" }); setMenu(null); }}>
              <Reply className="h-4 w-4" /> {t("reply")}
            </button>
            <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-1 text-start hover:bg-muted" onClick={() => { setMenu("react"); }}>
              <span className="text-base leading-none">🙂</span> {t("react")}
            </button>
            {isMine && !deleted && (
              <>
                <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-1 text-start hover:bg-muted" onClick={() => { onAction({ type: "edit" }); setMenu(null); }}>
                  <Pencil className="h-4 w-4" /> {t("edit")}
                </button>
                <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-1 text-start text-destructive hover:bg-muted" onClick={() => { onAction({ type: "delete" }); setMenu(null); }}>
                  <Trash2 className="h-4 w-4" /> {t("delete")}
                </button>
              </>
            )}
            {!isMine && !deleted && (
              <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-1 text-start text-destructive hover:bg-muted" onClick={() => { onAction({ type: "report" }); setMenu(null); }}>
                <Flag className="h-4 w-4" /> {t("report")}
              </button>
            )}
          </div>
        )}

        {!deleted && (
          <div className={cn("mt-0.5 flex items-center gap-1 px-1 text-[10px] text-muted-foreground", isMine ? "justify-end" : "justify-start")}>
            <span>{formatTime(message.created_at)}</span>
            {message.edited_at && <span>({t("edited")})</span>}
            {isMine && (message.pending ? (
              <Check className="h-3 w-3" />
            ) : message.readByPeer ? (
              <CheckCheck className="h-3 w-3 text-sky-500" />
            ) : (
              <CheckCheck className="h-3 w-3" />
            ))}
          </div>
        )}

        <button
          type="button"
          aria-label={t("react")}
          className={cn(
            "absolute bottom-0 z-10 hidden h-6 w-6 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition-opacity group-hover:flex",
            isMine ? "start-0 -translate-x-1/2 translate-y-1" : "end-0 translate-x-1/2 translate-y-1",
          )}
          onClick={() => setMenu((m) => (m === "actions" ? null : "actions"))}
        >
          <span className="text-sm leading-none">⋯</span>
        </button>
      </div>
    </div>
  );
}

function reactions(message: ThreadMessage): ReactionGroup[] | null {
  return message.reactions && message.reactions.length > 0 ? message.reactions : null;
}