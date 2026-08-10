"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Chat-with-owner action for a business detail page.
 *
 * - Logged-out users are sent to the login page with a `returnTo` query so they
 *   can come back to the business page and start the conversation.
 * - Authenticated customers reuse the existing messenger conversation API
 *   (`POST /api/messenger/conversations`), which never creates duplicates and
 *   refuses self-conversations (owner messaging their own business).
 * - On success the user is taken to the existing /messenger route opened on the
 *   conversation.
 */
export function useBusinessChat(businessId: string, ownerId: string | null, slug: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (mounted) setCurrentUserId(data.user?.id ?? null);
      })
      .catch(() => {
        /* session lookup is a convenience only — the API is the source of truth */
      });
    return () => {
      mounted = false;
    };
  }, []);

  const isOwner = Boolean(currentUserId && ownerId && currentUserId === ownerId);

  const openLogin = useCallback(() => {
    router.push(`/login?returnTo=${encodeURIComponent(`/business/${slug}`)}`);
  }, [router, slug]);

  const startChat = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      let uid: string | null = null;
      try {
        const { data } = await createClient().auth.getUser();
        uid = data.user?.id ?? null;
      } catch {
        /* ignore — the API decides authentication */
      }
      if (ownerId && uid === ownerId) return;

      const res = await fetch("/api/messenger/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });

      if (res.status === 401) {
        openLogin();
        return;
      }
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        if (json?.error === "cannot_message_self") return;
        console.error("chat.start failed", res.status, json?.error ?? res.statusText);
        return;
      }

      const json = (await res.json()) as { id?: string };
      if (!json.id) {
        console.error("chat.start: missing conversation id");
        return;
      }
      router.push(`/messenger?conversation=${encodeURIComponent(json.id)}`);
    } catch (err) {
      console.error("chat.start error", err);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [businessId, ownerId, openLogin, router]);

  return { startChat, busy, isOwner };
}