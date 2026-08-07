"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  targetType: "business" | "user";
  targetId: string;
  initialFollowers?: number;
  initialFollowing?: boolean;
};

export function FollowButton({
  targetType,
  targetId,
  initialFollowers = 0,
  initialFollowing = false,
}: Props) {
  const t = useTranslations("follow");
  const [count, setCount] = useState(initialFollowers);
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/follow?type=${targetType}&id=${targetId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        setCount(data.followers ?? 0);
        setFollowing(Boolean(data.isFollowing));
      })
      .finally(() => mounted && setReady(true));
    return () => {
      mounted = false;
    };
  }, [targetType, targetId]);

  async function toggle() {
    setLoading(true);
    const res = await fetch("/api/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: targetType, id: targetId }),
    });
    if (res.ok) {
      const data = await res.json();
      setFollowing(Boolean(data.following));
      setCount((c) => Math.max(0, c + (data.following ? 1 : -1)));
    }
    setLoading(false);
  }

  return (
    <Button
      variant={following ? "outline" : "default"}
      size="sm"
      disabled={loading || !ready}
      onClick={toggle}
      className="gap-1.5"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : following ? (
        <UserCheck className="h-4 w-4" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      {following ? t("following") : t("follow")}
      {count > 0 && <span className="text-xs opacity-80">· {count}</span>}
    </Button>
  );
}