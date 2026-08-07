"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function MessengerLink({ userId }: { userId: string }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let channel: { unsubscribe: () => void } | undefined;
    let disposed = false;

    const refresh = () => {
      fetch("/api/messenger/unread", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && !disposed) setUnread(d.unread ?? 0);
        })
        .catch(() => {});
    };

    refresh();
    const id = window.setInterval(refresh, 30000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);

    import("@/lib/supabase/client").then((mod) => {
      if (disposed) return;
      const client = mod.createClient();
      channel = client
        .channel(`messenger-badge:${userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "conversation_members" }, refresh)
        .subscribe();
    });

    return () => {
      disposed = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      channel?.unsubscribe();
    };
  }, [userId]);

  return (
    <Link
      href="/messenger"
      aria-label="messages"
      className="relative rounded-full p-2 text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
    >
      <MessageSquare className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-background">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}