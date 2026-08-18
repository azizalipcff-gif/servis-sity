"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { businessSchema } from "@/lib/validations/schemas";
import { slugify } from "@/lib/slug";
import { localizedName, type Locale } from "@/lib/translations";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { MOROCCAN_CITIES } from "@/lib/constants";
import type { BusinessDetail } from "@/lib/queries";
import type { Category } from "@/lib/supabase/database.types";
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

type Props = {
  business: BusinessDetail | null;
  categories: Category[];
  userId: string;
  locale: Locale;
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

export function BusinessForm({ business, categories, userId, locale }: Props) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");

  const [name, setName] = useState(business?.name ?? "");
  const [slug, setSlug] = useState(business?.slug ?? "");
  const [categoryId, setCategoryId] = useState(business?.category_id ?? "");
  const [description, setDescription] = useState(business?.description ?? "");
  const [phone, setPhone] = useState(business?.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(business?.whatsapp ?? "");
  const [whatsappEnabled, setWhatsappEnabled] = useState(
    business?.whatsapp_enabled ?? false,
  );

  const whatsappLink = whatsapp.trim()
    ? buildWhatsAppUrl({ whatsapp })
    : null;
  const [address, setAddress] = useState(business?.address ?? "");
  const [city, setCity] = useState(business?.city ?? "");
  const [logoUrl, setLogoUrl] = useState(business?.logo_url ?? "");
  const [coverUrl, setCoverUrl] = useState(business?.cover_url ?? "");

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

    const parsed = businessSchema.safeParse({
      name,
      category_id: categoryId,
      slug,
      description,
      phone: phone || undefined,
      whatsapp: whatsapp || undefined,
      address: address || undefined,
      city: city || undefined,
    });

    if (!parsed.success) {
      setError(tCommon("error"));
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const payload = {
        name: parsed.data.name,
        category_id: parsed.data.category_id,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        phone: parsed.data.phone || null,
        whatsapp: parsed.data.whatsapp || null,
        whatsapp_url: whatsappLink || null,
        whatsapp_enabled: Boolean(whatsappLink) && whatsappEnabled,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        logo_url: logoUrl || null,
        cover_url: coverUrl || null,
      };

      const { error: saveError } = business
        ? await supabase.from("businesses").update(payload).eq("id", business.id)
        : await supabase
            .from("businesses")
            .insert({ ...payload, owner_id: userId });

      if (saveError) {
        setError(tCommon("error"));
        return;
      }

      setSaved(true);
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

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
                  <Input
                    id="whatsapp"
                    type="tel"
                    dir="ltr"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                  />
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
                  <Input
                    id="city"
                    list="moroccan-cities-dash"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  <datalist id="moroccan-cities-dash">
                    {MOROCCAN_CITIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
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
