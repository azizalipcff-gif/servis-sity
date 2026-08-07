"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Paperclip, Mic, SendHorizonal, X } from "lucide-react";
import { QUICK_EMOJI } from "./emoji";
import { uploadFile, uploadRecording } from "./upload";
import type { MessengerKind } from "./upload";

export type ComposerPayload = {
  type: string;
  body: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMeta?: { kind: string; size: number; mime: string; width?: number; height?: number; duration?: number };
  replyTo?: string | null;
};

export function Composer({
  me,
  disabled,
  value,
  onChange,
  editing,
  replyTo,
  onCancelReply,
  onCancelEdit,
  onSend,
  onTyping,
}: {
  me: string;
  disabled?: boolean;
  value: string;
  onChange: (v: string) => void;
  editing: { id: string; body: string } | null;
  replyTo: { sender_id: string; body: string } | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onSend: (payload: ComposerPayload) => void;
  onTyping: () => void;
}) {
  const t = useTranslations("messenger");
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  function submit() {
    if (!value.trim()) return;
    onSend({ type: editing ? "text" : "text", body: value.trim() });
    onChange("");
  }

  async function sendFile(file: File) {
    setUploading(true);
    try {
      const kind: MessengerKind = await uploadFile(me, file);
      onSend({
        type: kind.kind === "image" ? "image" : "file",
        body: kind.name,
        attachmentUrl: kind.url,
        attachmentName: kind.name,
        attachmentMeta: {
          kind: kind.kind,
          size: kind.size,
          mime: kind.mime,
          width: kind.width,
          height: kind.height,
        },
      });
    } catch {
      /* upload failed */
    } finally {
      setUploading(false);
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        const kind = await uploadRecording(me, new Blob(chunksRef.current, { type: "audio/webm" }), (Date.now() - startTimeRef.current) / 1000);
        onSend({
          type: "voice",
          body: t("voice"),
          attachmentUrl: kind.url,
          attachmentMeta: { kind: "voice", size: kind.size, mime: kind.mime, duration: kind.duration },
        });
      };
      rec.start();
      setRecording(true);
    } catch {
      /* permission denied */
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <div className="border-t p-3">
      {recording && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
          <span>{t("recordVoice")}</span>
          <button type="button" className="ms-auto font-medium underline" onClick={stopRecording}>
            {t("stop")}
          </button>
        </div>
      )}
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs">
          <span className="font-medium">{t("reply")}</span>
          <span className="flex-1 truncate text-muted-foreground">{replyTo.body}</span>
          <button type="button" onClick={onCancelReply} aria-label={t("cancel")}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {editing && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs">
          <span className="font-medium">{t("edit")}</span>
          <button type="button" className="text-destructive" onClick={onCancelEdit}>
            {t("cancel")}
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={startRecording}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={t("recordVoice")}
          title={t("recordVoice")}
        >
          <Mic className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={t("attachFile")}
          title={t("attachFile")}
          disabled={disabled}
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void sendFile(f);
            e.target.value = "";
          }}
        />
        <textarea
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            onTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={t("messagePlaceholder")}
          rows={1}
          disabled={disabled}
          className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl bg-muted px-4 py-2.5 text-sm outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || (!value.trim() && !uploading)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
          aria-label={t("send")}
        >
          <SendHorizonal className="h-5 w-5" />
        </button>
      </div>
      <EmojiBar onChange={(v) => { onChange(value + v); onTyping(); }} />
    </div>
  );
}

function EmojiBar({ onChange }: { onChange: (e: string) => void }) {
  const t = useTranslations("messenger");
  return (
    <div className="mt-2 flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange("🙂")}
        className="rounded-full p-1 text-lg transition-transform hover:scale-110"
        title={t("react")}
      >
        🙂
      </button>
      {QUICK_EMOJI.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onChange(e)}
          className="rounded-full p-1 text-lg transition-transform hover:scale-125"
        >
          {e}
        </button>
      ))}
    </div>
  );
}