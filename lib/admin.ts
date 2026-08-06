import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import type { Profile } from "@/lib/supabase/database.types";

/**
 * Server-side guard used by admin API routes and server components.
 * Returns the Supabase client + admin profile when the caller is an
 * authenticated, non-banned admin — otherwise null.
 */
export const requireAdmin = cache(
  async (): Promise<{
    admin: Profile;
    supabase: Awaited<ReturnType<typeof createClient>>;
  } | null> => {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin" || profile.banned) return null;
    return { admin: profile, supabase };
  },
);