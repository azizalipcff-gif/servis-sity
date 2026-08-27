"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRouter as useLocaleRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { businessSchema } from "@/lib/validations/schemas";
import { slugify } from "@/lib/slug";
import { localizedName, type Locale } from "@/lib/translations";
import {
  buildWhatsAppUrl,
  normalizeMoroccanWhatsApp,
  whatsappNationalDigits,
  formatWhatsAppNational,
} from "@/lib/whatsapp";
import { resolveInitialCityId, deriveCityValue } from "@/lib/business/city-relation";
import { resolveOwnerId } from "@/lib/business/owner";
import { deleteStoredUrl } from "@/lib/uploads";
import type { BusinessDetail } from "@/lib/queries";
import type { Category, City } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { Stagger, StaggerItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploadField } from "@/components/dashboard/image-upload";
import { GalleryEditor, type GalleryItem } from "@/components/dashboard/gallery-editor";
import { HoursEditor, type HourRow, emptyWeek } from "@/components/dashboard/hours-editor";

type Props = {
  business: BusinessDetail | null;
  categories: Category[];
  cities: City[];
  userId: string;
  locale: Locale;
  successHref?: string;
};

function SectionHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold uppercase tracking-wide">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function BusinessForm({ business, categories, cities, userId, locale, successHref }: Props) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const localeRouter = useLocaleRouter();

  const [name, setName] = useState(business?.name ?? "");
  const [slug, setSlug] = useState(business?.slug ?? "");
  const [categoryId, setCategoryId] = useState(business?.category_id ?? "");
  const [subcategoryId, setSubcategoryId] = useState(business?.subcategory_id ?? "");
  const [description, setDescription] = useState(business?.description ?? "");
  const [phone, setPhone] = useState(business?.phone ?? "");
  const [whatsappDigits, setWhatsappDigits] = useState(() => {
    const stored = business?.whatsapp;
    if (!stored) return "";
    return formatWhatsAppNational(
      whatsappNationalDigits(normalizeMoroccanWhatsApp(stored) ?? stored),
    );
  });
  const [whatsappEnabled, setWhatsappEnabled] = useState(
    business?.whatsapp_enabled ?? false,
  );

  // digits are the national portion (6XXXXXXXX); +212 is a fixed visible prefix.
  const digits = whatsappDigits.replace(/\s/g, "");
  const whatsappValue = digits ? `+212${digits}` : "";
  const whatsappLink = whatsappValue
    ? buildWhatsAppUrl({ whatsapp: whatsappValue })
    : null;
  const whatsappError =
    digits !== "" && !/^[5-7]\d{8}$/.test(digits);
  const [address, setAddress] = useState(business?.address ?? "");
  const [cityId, setCityId] = useState(() => resolveInitialCityId(cities, business));
  const [logoUrl, setLogoUrl] = useState(business?.logo_url ?? "");
  const [coverUrl, setCoverUrl] = useState(business?.cover_url ?? "");

  // Extra contact / profile / social fields — pre-populated from the saved row.
  const [tags, setTags] = useState(business?.tags ?? "");
  const [email, setEmail] = useState(business?.email ?? "");
  const [website, setWebsite] = useState(business?.website ?? "");
  const [facebook, setFacebook] = useState(business?.facebook ?? "");
  const [instagram, setInstagram] = useState(business?.instagram ?? "");
  const [tiktok, setTiktok] = useState(business?.tiktok ?? "");
  const [linkedin, setLinkedin] = useState(business?.linkedin ?? "");

  // Gallery (media table) + opening hours (business_hours table).
  const [mediaItems, setMediaItems] = useState<GalleryItem[]>(
    (business?.media ?? []).map((m, i) => ({
      id: m.id,
      url: m.url,
      sort_order: i,
    })),
  );
  const [hours, setHours] = useState<HourRow[]>(
    business?.hours && business.hours.length > 0
      ? business.hours.map((h) => ({
          day_of_week: h.day_of_week,
          open_time: h.open_time,
          close_time: h.close_time,
          is_closed: h.is_closed,
        }))
      : emptyWeek(),
  );

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  function onNameChange(value: string) {
    setName(value);
    if (!business || slug === slugify(business.name)) {
      setSlug(slugify(value));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    console.log("[BIZ DEBUG] handleSubmit start", {
      hasBusiness: !!business,
      name,
      categoryId,
      cityId,
      slug,
    });

    const selectedCity = cities.find((c) => c.id === cityId) ?? null;

    const parsed = businessSchema.safeParse({
      name,
      category_id: categoryId,
      city_id: cityId || undefined,
      slug,
      description,
      phone: phone || undefined,
      whatsapp: whatsappValue || undefined,
      address: address || undefined,
      city: selectedCity ? selectedCity.slug : undefined,
    });

    if (!parsed.success) {
      console.log("[BIZ DEBUG] validation failed", parsed.error.flatten());
      setError(tCommon("error"));
      return;
    }

    // The select only offers canonical cities, but guard against a tampered or
    // stale city_id: it must resolve to a real row in the cities table.
    if (!selectedCity) {
      console.log("[BIZ DEBUG] no selectedCity", { cityId });
      setError(tCommon("error"));
      return;
    }

    setLoading(true);
    try {
        const supabase = createClient();

        // Ownership is derived from the authenticated session that performs the
        // insert. The RLS WITH CHECK `owner_id = auth.uid()` is the source of
        // truth, so we bind owner_id to the same session id and never to a prop
        // or an empty string. Unauthenticated creation fails closed.
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
          console.log("[BIZ DEBUG] unauthenticated business creation blocked", {
            authError: authError?.message ?? null,
          });
          setError(tCommon("error"));
          return;
        }
        const ownerId = resolveOwnerId(authData.user.id);

        const whatsappNumber = parsed.data.whatsapp || null;
      const whatsappUrl = whatsappNumber
        ? buildWhatsAppUrl({ whatsapp: whatsappNumber })
        : null;
      const payload = {
        name: parsed.data.name,
        category_id: parsed.data.category_id,
        subcategory_id: subcategoryId || null,
        city_id: selectedCity.id,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        phone: parsed.data.phone || null,
        whatsapp: whatsappNumber,
        whatsapp_url: whatsappUrl,
        whatsapp_enabled: Boolean(whatsappUrl) && whatsappEnabled,
        address: parsed.data.address || null,
        city: deriveCityValue(selectedCity),
        logo_url: logoUrl || null,
        cover_url: coverUrl || null,
        tags: tags || null,
        email: email || null,
        website: website || null,
        facebook: facebook || null,
        instagram: instagram || null,
        tiktok: tiktok || null,
        linkedin: linkedin || null,
      };

      // Update the existing record, or create a new one bound to this owner.
      let targetId: string | null = null;
      if (business) {
        const { error } = await supabase
          .from("businesses")
          .update(payload)
          .eq("id", business.id);
        if (error) {
          setError(tCommon("error"));
          return;
        }
        targetId = business.id;
      } else {
        console.log("[BIZ DEBUG] INSERT attempt", {
          owner_id: ownerId,
          name: parsed.data.name,
          category_id: parsed.data.category_id,
          city_id: parsed.data.city_id,
          slug: parsed.data.slug,
        });
        const { data, error } = await supabase
          .from("businesses")
          .insert({ ...payload, owner_id: ownerId })
          .select("id")
          .maybeSingle();
        console.log("[BIZ DEBUG] INSERT result", { data, error });
        if (error || !data) {
          console.error("[BIZ DEBUG] INSERT failed", {
            message: error?.message ?? null,
          });
          setError(error?.message ? error.message : tCommon("error"));
          return;
        }
        targetId = data.id;
      }

      if (!targetId) {
        setError(tCommon("error"));
        return;
      }

      // --- Gallery (media) ---------------------------------------------------
      // Preserve existing photos unless the owner removed them; only newly
      // uploaded files get written here. Removed photos are deleted from both
      // the media table and Storage (best-effort, never blocks the save).
      const originalIds = (business?.media ?? []).map((m) => m.id);
      const keptIds = mediaItems.filter((i) => i.id).map((i) => i.id as string);
      const deletedIds = originalIds.filter((id) => !keptIds.includes(id));
      for (const id of deletedIds) {
        const m = (business?.media ?? []).find((x) => x.id === id);
        if (m) {
          await deleteStoredUrl(m.url);
          await supabase.from("media").delete().eq("id", id);
        }
      }
      for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        if (item.id) {
          await supabase.from("media").update({ sort_order: i }).eq("id", item.id);
        } else {
          await supabase
            .from("media")
            .insert({ business_id: targetId, type: "image", url: item.url, sort_order: i });
        }
      }

      // --- Opening hours (business_hours) -----------------------------------
      // Replaced wholesale from the editor's current state (owner-controlled).
      await supabase.from("business_hours").delete().eq("business_id", targetId);
      if (hours.some((h) => !h.is_closed)) {
        await supabase.from("business_hours").insert(
          hours.map((h) => ({
            business_id: targetId,
            day_of_week: h.day_of_week,
            open_time: h.is_closed ? null : h.open_time,
            close_time: h.is_closed ? null : h.close_time,
            is_closed: h.is_closed,
          })),
        );
      }

      setSaved(true);
      router.refresh();
      if (successHref) localeRouter.push(successHref);
    } catch (e) {
      console.error("[BIZ DEBUG] exception", e);
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  const subcategories = categories.filter((c) => c.parent_id === categoryId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {business ? tCommon("edit") + " — " + business.name : t("createBusiness")}
        </CardTitle>
        <CardDescription>{t("createBusinessTitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Stagger className="space-y-6">
            <StaggerItem className="space-y-4">
              <SectionHeading
                title={t("sectionBasic")}
                hint={t("sectionBasicHint")}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessName">{t("businessName")}</Label>
                  <Input
                    id="businessName"
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("businessCategory")}</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {localizedName(c, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {subcategories.length > 0 && (
                <div className="space-y-2">
                  <Label>{t("subcategory")}</Label>
                  <Select value={subcategoryId} onValueChange={setSubcategoryId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {localizedName(c, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="slug">{t("slug")}</Label>
                <Input
                  id="slug"
                  dir="ltr"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="mon-boutique"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("description")}</Label>
                <textarea
                  id="description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                />
              </div>
            </StaggerItem>

            <Separator />

            <StaggerItem className="space-y-4">
              <SectionHeading
                title={t("sectionContact")}
                hint={t("sectionContactHint")}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("phone")}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">{t("whatsapp")}</Label>
                  <div
                    className={cn(
                      "flex h-10 w-full items-center rounded-xl border border-input bg-background px-3 text-sm shadow-sm transition-colors",
                      "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background",
                    )}
                  >
                    <span
                      dir="ltr"
                      className="shrink-0 select-none text-sm text-muted-foreground"
                    >
                      +212
                    </span>
                    <input
                      id="whatsapp"
                      type="tel"
                      inputMode="numeric"
                      dir="ltr"
                      value={whatsappDigits}
                      onChange={(e) =>
                        setWhatsappDigits(whatsappNationalDigits(e.target.value))
                      }
                      onBlur={() =>
                        setWhatsappDigits(formatWhatsAppNational(digits))
                      }
                      placeholder="6XX XXX XXX"
                      aria-invalid={whatsappError || undefined}
                      className="min-w-0 flex-1 border-0 bg-transparent px-1.5 py-2 text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  {whatsappError && (
                    <p className="text-xs text-destructive">{t("whatsappInvalid")}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                  <MessageCircle className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{t("whatsappButton")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("whatsappButtonHint")}
                    </p>
                    {whatsappLink ? (
                      <span dir="ltr" className="mt-0.5 block text-xs text-muted-foreground">
                        {whatsappLink}
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(whatsappLink) && whatsappEnabled}
                  disabled={!whatsappLink}
                  onClick={() => setWhatsappEnabled((v) => !v)}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-40",
                    Boolean(whatsappLink) && whatsappEnabled
                      ? "bg-primary"
                      : "bg-muted-foreground/30",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 size-4 rounded-full bg-background shadow transition-all",
                      Boolean(whatsappLink) && whatsappEnabled
                        ? "ltr:left-6 rtl:right-6"
                        : "ltr:left-0.5 rtl:right-0.5",
                    )}
                  />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="address">{t("address")}</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">{t("city")}</Label>
                  <Select value={cityId} onValueChange={setCityId}>
                    <SelectTrigger id="city">
                      <SelectValue placeholder={t("city")} />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {localizedName(c, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">{t("website")}</Label>
                  <Input
                    id="website"
                    dir="ltr"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
              </div>
            </StaggerItem>

            <Separator />

            <StaggerItem className="space-y-4">
              <SectionHeading
                title={t("sectionSocial")}
                hint={t("sectionSocialHint")}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="facebook">{t("facebook")}</Label>
                  <Input
                    id="facebook"
                    dir="ltr"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram">{t("instagram")}</Label>
                  <Input
                    id="instagram"
                    dir="ltr"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiktok">{t("tiktok")}</Label>
                  <Input
                    id="tiktok"
                    dir="ltr"
                    value={tiktok}
                    onChange={(e) => setTiktok(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin">{t("linkedin")}</Label>
                  <Input
                    id="linkedin"
                    dir="ltr"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                  />
                </div>
              </div>
            </StaggerItem>

            <Separator />

            <StaggerItem className="space-y-4">
              <SectionHeading
                title={t("sectionExtra")}
                hint={t("sectionExtraHint")}
              />

              <div className="space-y-2">
                <Label htmlFor="tags">{t("tags")}</Label>
                <Input
                  id="tags"
                  dir="ltr"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="plomberie, urgence, certifié"
                />
              </div>
            </StaggerItem>

            <Separator />

            <StaggerItem className="space-y-4">
              <SectionHeading
                title={t("sectionMedia")}
                hint={t("sectionMediaHint")}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <ImageUploadField
                  label={t("logo")}
                  hint={t("uploadHint")}
                  userId={userId}
                  bucket="business-logos"
                  value={logoUrl}
                  onChange={setLogoUrl}
                />
                <ImageUploadField
                  label={t("cover")}
                  hint={t("uploadHint")}
                  userId={userId}
                  bucket="business-covers"
                  value={coverUrl}
                  onChange={setCoverUrl}
                />
              </div>
            </StaggerItem>

            <Separator />

            <StaggerItem className="space-y-4">
              <SectionHeading
                title={t("gallery")}
                hint={t("sectionGalleryHint")}
              />

              <GalleryEditor items={mediaItems} onChange={setMediaItems} userId={userId} />
            </StaggerItem>

            <Separator />

            <StaggerItem className="space-y-4">
              <SectionHeading
                title={t("sectionHours")}
                hint={t("sectionHoursHint")}
              />

              <HoursEditor value={hours} onChange={setHours} locale={locale} />
            </StaggerItem>
          </Stagger>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {saved && (
            <p className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
              <CheckCircle2 className="size-4" />
              {t("businessSaved")}
            </p>
          )}

          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {t("saveBusiness")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
