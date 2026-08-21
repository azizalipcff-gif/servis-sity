"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Check,
  CheckCheck,
  FileText,
  Flag,
  ImageOff,
  Mic,
  Pencil,
  Reply,
  RotateCcw,
  SmilePlus,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import type { MessageLite } from "@/lib/messenger";
import { cn } from "@/lib/utils";
import { formatTime } from "./time";
import { Avatar } from "./avatar";
import { QUICK_EMOJI } from "./emoji";
import { linkifySegments, safeHref } from "./linkify";

export type ReactionGroup = { emoji: string; count: number; mine: boolean };

export type ThreadMessage = MessageLite & {
  reactions?: ReactionGroup[];
  readByPeer?: boolean;
  pending?: boolean;
  failed?: boolean;
  reply?: (MessageLite & { mine?: boolean }) | null;
};

export type BubbleAction = {
  type: "react" | "reply" | "edit" | "delete" | "report" | "retry";
  emoji?: string;
};

function BodyText({ text }: { text: string }) {
  const segments = linkifySegments(text);
  return (
    <span className="whitespace-pre-wrap break-words">
      {segments.map((seg, i) =>
        seg.kind === "link" ? (
          <a
            key={i}
            href={safeHref(seg.value) || undefined}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-medium underline underline-offset-2 hover:opacity-80"
          >
            {seg.value}
          </a>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </span>
  );
}

function ImageAttachment({ src, alt }: { src: string; alt: string }) {
  const t = useTranslations("messenger");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  if (state === "error") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
        <ImageOff className="h-4 w-4" />
        {t("imageError")}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setZoom(true)}
        aria-label={alt || t("image")}
        className="relative -m-1 block overflow-hidden rounded-xl"
      >
        {state === "loading" && (
          <span aria-hidden className="absolute inset-0 animate-pulse bg-muted" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setState("ok")}
          onError={() => setState("error")}
          className="max-h-72 w-auto max-w-full object-cover"
        />
      </button>
      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt || t("image")}
          onClick={() => setZoom(false)}
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
        >
          <button
            type="button"
            onClick={() => setZoom(false)}
            aria-label={t("cancel")}
            className="absolute end-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
}

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
  onAction: (action: BubbleAction) => void;
}) {
  const t = useTranslations("messenger");
  const locale = useLocale();
  const [menu, setMenu] = useState<"react" | "actions" | null>(null);

  const deleted = Boolean(message.deleted_at);
  const failed = Boolean(message.failed);

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
            failed && "ring-1 ring-destructive/60",
          )}
        >
          {deleted ? (
            <span className="italic">{t("messageDeleted")}</span>
          ) : message.type === "image" && message.attachment_url ? (
            <ImageAttachment src={message.attachment_url} alt={message.body} />
          ) : message.type === "voice" && message.attachment_url ? (
            <div className="flex items-center gap-2 py-1">
              <Mic className="h-4 w-4 opacity-70" />
              <audio
                src={message.attachment_url}
                controls
                preload="metadata"
                className="h-9 w-56 max-w-full"
              />
            </div>
          ) : message.attachment_url ? (
            <a
              href={safeHref(message.attachment_url) || undefined}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center gap-2 underline underline-offset-2"
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="max-w-[200px] truncate">{message.body || t("file")}</span>
            </a>
          ) : message.type === "emoji" ? (
            <span className="text-3xl">{message.body}</span>
          ) : (
            <BodyText text={message.body} />
          )}
        </div>

        {message.reply && (
          <div
            className={cn(
              "mb-0.5 mt-1 max-w-full truncate rounded-lg px-3 py-1 text-xs opacity-80",
              isMine ? "bg-primary/20" : "bg-secondary",
            )}
          >
            <span className="font-medium">
              {message.reply.mine ? `${t("you")}: ` : ""}
            </span>
            {message.reply.deleted_at
              ? t("messageDeleted")
              : message.reply.body ||
                (message.reply.type === "image" ? t("image") : t("file"))}
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

        {failed && (
          <button
            type="button"
            onClick={() => onAction({ type: "retry" })}
            className="mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
          >
            <TriangleAlert className="h-3 w-3" />
            {t("failed")}
            <RotateCcw className="h-3 w-3" />
            {t("retry")}
          </button>
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
              <SmilePlus className="h-4 w-4" /> {t("react")}
            </button>
            {isMine && !deleted && message.type === "text" && (
              <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-1 text-start hover:bg-muted" onClick={() => { onAction({ type: "edit" }); setMenu(null); }}>
                <Pencil className="h-4 w-4" /> {t("edit")}
              </button>
            )}
            {isMine && !deleted && (
              <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-1 text-start text-destructive hover:bg-muted" onClick={() => { onAction({ type: "delete" }); setMenu(null); }}>
                <Trash2 className="h-4 w-4" /> {t("delete")}
              </button>
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
            <span suppressHydrationWarning>{formatTime(message.created_at, locale)}</span>
            {message.edited_at && <span>({t("edited")})</span>}
            {isMine && !failed && (
              <span aria-label={message.pending ? t("sending") : message.readByPeer ? t("seen") : t("delivered")}>
                {message.pending ? (
                  <Check className="h-3 w-3 opacity-70" />
                ) : message.readByPeer ? (
                  <CheckCheck className="h-3 w-3 text-sky-500" />
                ) : (
                  <CheckCheck className="h-3 w-3 opacity-50" />
                )}
              </span>
            )}
          </div>
        )}

        {!deleted && !failed && (
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
        )}
      </div>
    </div>
  );
}

function reactions(message: ThreadMessage): ReactionGroup[] | null {
  return message.reactions && message.reactions.length > 0 ? message.reactions : null;
}
