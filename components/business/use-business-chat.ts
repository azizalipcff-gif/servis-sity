"use client";

import { useCallback, useEffect, useState } from "react";
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

  useEffect(() => {
    let mounted = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (mounted) setCurrentUserId(data.user?.id ?? null);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      mounted = false;
    };
  }, []);

  const isOwner = Boolean(currentUserId && ownerId && currentUserId === ownerId);

  const openLogin = useCallback(() => {
    // Locale-relative path: next-intl router + auth callback add the locale prefix.
    router.push({ pathname: "/login", query: { returnTo: `/business/${slug}` } });
  }, [router, slug]);

  const startChat = useCallback(async () => {
    if (busy) return;

    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      openLogin();
      return;
    }
    if (ownerId && data.user.id === ownerId) return;

    setBusy(true);
    try {
      const res = await fetch("/api/messenger/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      if (res.status === 401) {
        openLogin();
        return;
      }
      if (!res.ok) return;

      const json = (await res.json()) as { id?: string };
      if (!json.id) return;
      router.push({ pathname: "/messenger", query: { conversation: json.id } });
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }, [businessId, ownerId, busy, openLogin, router]);

  return { startChat, busy, isOwner };
}