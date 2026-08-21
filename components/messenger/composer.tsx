"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Mic, Paperclip, SendHorizonal, Square, X } from "lucide-react";
import { QUICK_EMOJI } from "./emoji";
import { uploadFile, uploadRecording, MESSENGER_MAX_FILE_BYTES, MESSENGER_MAX_VOICE_BYTES } from "./upload";
import type { MessengerKind } from "./upload";

/** Mirrors MAX_BODY enforced by POST /api/messenger/messages. */
export const MESSENGER_MAX_BODY = 4000;

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
  sending,
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
  /** True while a send request is in flight — blocks duplicate submits. */
  sending?: boolean;
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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  // Touch keyboards already have a send affordance and users expect Enter to
  // insert a newline there; desktop gets Enter-to-send / Shift+Enter newline.
  const isTouch = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
    [],
  );

  const blocked = disabled || uploading || recording;

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || blocked || sending) return;
    onSend({ type: "text", body: trimmed.slice(0, MESSENGER_MAX_BODY) });
    onChange("");
  }

  async function sendFile(file: File) {
    setUploadError(null);
    if (file.size === 0 || file.size > MESSENGER_MAX_FILE_BYTES) {
      setUploadError(t("uploadFailed"));
      return;
    }
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
      setUploadError(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) return;
    setUploadError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size === 0 || blob.size > MESSENGER_MAX_VOICE_BYTES) {
          setUploadError(t("uploadFailed"));
          return;
        }
        setUploading(true);
        try {
          const kind = await uploadRecording(me, blob, (Date.now() - startTimeRef.current) / 1000);
          onSend({
            type: "voice",
            body: t("voice"),
            attachmentUrl: kind.url,
            attachmentMeta: { kind: "voice", size: kind.size, mime: kind.mime, duration: kind.duration },
          });
        } catch {
          setUploadError(t("uploadFailed"));
        } finally {
          setUploading(false);
        }
      };
      rec.start();
      setRecording(true);
    } catch {
      setUploadError(t("uploadFailed"));
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  const nearLimit = value.length >= MESSENGER_MAX_BODY - 100;

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
      {(replyTo || editing) && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs">
          <span className="font-medium">{editing ? t("edit") : t("reply")}</span>
          <span className="flex-1 truncate text-muted-foreground">
            {editing ? editing.body : replyTo?.body}
          </span>
          <button
            type="button"
            onClick={editing ? onCancelEdit : onCancelReply}
            aria-label={t("cancel")}
            className="rounded p-0.5 hover:bg-background"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {uploadError && (
        <p role="alert" className="mb-1 text-xs font-medium text-destructive">
          {uploadError}
        </p>
      )}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled || uploading}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          aria-label={t("recordVoice")}
          title={t("recordVoice")}
        >
          {recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={t("attachFile")}
          title={t("attachFile")}
          disabled={blocked}
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
            onChange(e.target.value.slice(0, MESSENGER_MAX_BODY));
            onTyping();
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.shiftKey || isTouch) return;
            e.preventDefault();
            submit();
          }}
          enterKeyHint={isTouch ? "enter" : "send"}
          maxLength={MESSENGER_MAX_BODY}
          placeholder={t("messagePlaceholder")}
          aria-label={t("messagePlaceholder")}
          rows={1}
          disabled={disabled}
          className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl bg-muted px-4 py-2.5 text-sm outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={submit}
          disabled={blocked || sending || !value.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
          aria-label={t("send")}
        >
          {sending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <SendHorizonal className="h-5 w-5 rtl:-scale-x-100" />
          )}
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <EmojiBar onChange={(v) => { onChange((value + v).slice(0, MESSENGER_MAX_BODY)); onTyping(); }} />
        {nearLimit && !editing && (
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {value.length}/{MESSENGER_MAX_BODY}
          </span>
        )}
      </div>
    </div>
  );
}

function EmojiBar({ onChange }: { onChange: (e: string) => void }) {
  const t = useTranslations("messenger");
  return (
    <div className="flex items-center gap-1">
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
