"use client";

import { createClient } from "@/lib/supabase/client";

export type MessengerUploadMeta = {
  url: string;
  kind: string;
  name: string;
  size: number;
  mime: string;
  width?: number;
  height?: number;
  duration?: number;
};

function kindFor(mime: string, name: string): string {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (/\.(pdf)$/i.test(name)) return "pdf";
  if (/\.(doc|docx)$/i.test(name)) return "doc";
  if (/\.(xls|xlsx|csv)$/i.test(name)) return "sheet";
  if (/\.(zip|rar|7z)$/i.test(name)) return "zip";
  return "file";
}

async function imageSize(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = String(reader.result);
    };
    reader.onerror = () => resolve({ width: 0, height: 0 });
    reader.readAsDataURL(blob);
  });
}

async function upload(
  userId: string,
  folder: "attachments" | "voice-notes",
  blob: Blob,
  name: string,
): Promise<string> {
  const client = createClient();
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${userId}/${folder}/${Date.now()}-${safeName}`;
  const { error } = await client.storage.from("attachments").upload(path, blob, {
    contentType: blob.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error("upload_failed");
  const { data } = client.storage.from("attachments").getPublicUrl(path);
  return data.publicUrl;
}

export type MessengerKind = MessengerUploadMeta;

export async function uploadFile(
  userId: string,
  file: File,
): Promise<MessengerKind> {
  const url = await upload(userId, "attachments", file, file.name);
  let width: number | undefined;
  let height: number | undefined;
  if (file.type.startsWith("image/")) {
    const dims = await imageSize(file);
    if (dims.width) { width = dims.width; height = dims.height; }
  }
  return {
    url,
    kind: kindFor(file.type, file.name),
    name: file.name,
    size: file.size,
    mime: file.type,
    width,
    height,
  };
}

export async function uploadRecording(
  userId: string,
  blob: Blob,
  duration: number,
): Promise<MessengerKind> {
  const url = await upload(userId, "voice-notes", blob, "voice.webm");
  return {
    url,
    kind: "voice",
    name: "voice.webm",
    size: blob.size,
    mime: blob.type || "audio/webm",
    duration: Math.round(duration),
  };
}