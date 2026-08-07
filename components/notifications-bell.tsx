"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

type LiveNotif = {
  id: string;
  title?: string;
  body?: string;
  link?: string | null;
};

export function NotificationsBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState<LiveNotif[]>([]);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/notifications?limit=1", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setUnread(data.unread ?? 0);
    }
  }, []);

  useEffect(() => {
    void refresh();

    let channel: { unsubscribe: () => void } | undefined;

    import("@/lib/supabase/client").then((mod) => {
      const client = mod.createClient();
      channel = client
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${userId}`,
          },
          (payload) => {
            setUnread((c) => c + 1);
            setToasts((prev) => [...prev.slice(-2), payload.new as LiveNotif]);
          },
        )
        .subscribe();
    });

    return () => {
      channel?.unsubscribe();
    };
  }, [userId, refresh]);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function go() {
    void fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    router.push("/profile/notifications");
  }

  return (
    <>
      <button
        type="button"
        onClick={go}
        aria-label="notifications"
        className="relative rounded-full p-2 text-foreground/70 transition-colors hover:bg-muted hover:text-foreground max-md:hidden"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-background">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {toasts.length > 0 && (
        <div className="fixed end-4 top-16 z-50 w-80 space-y-2">
          {toasts.map((n) => (
            <div
              key={n.id}
              role="status"
              className="flex items-start gap-2 rounded-xl border bg-card p-3 shadow-lg"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{n.title || "Notification"}</p>
                {n.body && <p className="truncate text-xs text-muted-foreground">{n.body}</p>}
              </div>
              <button
                type="button"
                aria-label="dismiss"
                onClick={() => dismiss(n.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}