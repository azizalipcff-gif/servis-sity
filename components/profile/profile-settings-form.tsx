"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Check } from "lucide-react";
import type { Profile } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { ImageUploadField } from "@/components/dashboard/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  profile: Profile;
  userId: string;
};

const inputClass =
  "bg-background text-sm text-foreground placeholder:text-muted-foreground";

export function ProfileSettingsForm({ profile, userId }: Props) {
  const t = useTranslations("profile");
  const [form, setForm] = useState({
    full_name: profile.full_name ?? "",
    username: profile.username ?? "",
    phone: profile.phone ?? "",
    city: profile.city ?? "",
    website: profile.website ?? "",
    address: profile.address ?? "",
    bio: profile.bio ?? "",
    languages: profile.languages ?? "",
    skills: profile.skills ?? "",
    experience: profile.experience ?? "",
    facebook: profile.facebook ?? "",
    instagram: profile.instagram ?? "",
    tiktok: profile.tiktok ?? "",
    linkedin: profile.linkedin ?? "",
    whatsapp: profile.whatsapp ?? "",
  });
  const [avatar, setAvatar] = useState(profile.avatar_url ?? "");
  const [cover, setCover] = useState(profile.cover_url ?? "");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setDone(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        ...form,
        avatar_url: avatar || null,
        cover_url: cover || null,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      setError(t("saveError"));
      return;
    }
    setDone(true);
  }

  const field = (key: keyof typeof form, label: string) => ({
    label,
    value: form[key],
    onChange: (value: string) => set(key, value),
  });
  const F = (f: ReturnType<typeof field>) => (
    <div className="space-y-1.5">
      <Label htmlFor={f.label}>{f.label}</Label>
      <Input
        id={f.label}
        className={inputClass}
        value={f.value}
        onChange={(e) => f.onChange(e.target.value)}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="grid gap-5 sm:grid-cols-2">
        <ImageUploadField
          label={t("avatarLabel")}
          hint={t("avatarLabel")}
          userId={userId}
          bucket="user-avatars"
          value={avatar}
          onChange={setAvatar}
        />
        <ImageUploadField
          label={t("coverLabel")}
          hint={t("coverLabel")}
          userId={userId}
          bucket="business-covers"
          value={cover}
          onChange={setCover}
        />
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h3 className="text-sm font-semibold">{t("basicSection")}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {F(field("full_name", t("fieldFullName")))}
          {F(field("username", t("fieldUsername")))}
          {F(field("phone", t("fieldPhone")))}
          {F(field("city", t("fieldCity")))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h3 className="text-sm font-semibold">{t("contactSection")}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {F(field("website", t("fieldWebsite")))}
          {F(field("address", t("fieldAddress")))}
          {F(field("whatsapp", t("fieldWhatsapp")))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h3 className="text-sm font-semibold">{t("profileSection")}</h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bio">{t("fieldBio")}</Label>
            <textarea
              id="bio"
              rows={4}
              className={`${inputClass} w-full rounded-md border bg-transparent px-3 py-2`}
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {F(field("languages", t("fieldLanguages")))}
            {F(field("skills", t("fieldSkills")))}
            {F(field("experience", t("fieldExperience")))}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h3 className="text-sm font-semibold">{t("socialSection")}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {F(field("facebook", t("fieldFacebook")))}
          {F(field("instagram", t("fieldInstagram")))}
          {F(field("tiktok", t("fieldTiktok")))}
          {F(field("linkedin", t("fieldLinkedin")))}
        </div>
      </section>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={saving} className="gap-2">
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : done ? (
          <Check className="h-4 w-4" />
        ) : null}
        {done ? t("saved") : t("save")}
      </Button>
    </form>
  );
}