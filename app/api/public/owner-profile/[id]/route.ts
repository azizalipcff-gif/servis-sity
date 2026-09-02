import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid owner id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("owner_id", id)
    .eq("status", "approved")
    .limit(1)
    .maybeSingle();

  if (businessError) {
    return NextResponse.json({ error: "Unable to load owner profile" }, { status: 500 });
  }

  if (!business) {
    return NextResponse.json({ error: "Owner not found" }, { status: 404 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, username, city, bio, avatar_url, cover_url, website, languages, skills, experience, created_at")
    .eq("id", id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Owner profile not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      id: profile.id,
      full_name: profile.full_name,
      username: profile.username,
      city: profile.city,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      cover_url: profile.cover_url,
      website: profile.website,
      languages: profile.languages,
      skills: profile.skills,
      experience: profile.experience,
      created_at: profile.created_at,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
