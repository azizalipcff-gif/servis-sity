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

export function BusinessForm({ business, categories, userId, locale, successHref }: Props) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const localeRouter = useLocaleRouter();

  const [name, setName] = useState(business?.name ?? "");
  const [slug, setSlug] = useState(business?.slug ?? "");
  const [categoryId, setCategoryId] = useState(business?.category_id ?? "");
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
      whatsapp: whatsappValue || undefined,
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
      const whatsappNumber = parsed.data.whatsapp || null;
      const whatsappUrl = whatsappNumber
        ? buildWhatsAppUrl({ whatsapp: whatsappNumber })
        : null;
      const payload = {
        name: parsed.data.name,
        category_id: parsed.data.category_id,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        phone: parsed.data.phone || null,
        whatsapp: whatsappNumber,
        whatsapp_url: whatsappUrl,
        whatsapp_enabled: Boolean(whatsappUrl) && whatsappEnabled,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        logo_url: logoUrl || null,
        cover_url: coverUrl || null,
      };

      const result = business
        ? await supabase.from("businesses").update(payload).eq("id", business.id)
        : await supabase
            .from("businesses")
            .insert({ ...payload, owner_id: userId })
            .select("id, owner_id")
            .maybeSingle();

      const saveError = result.error;
      const inserted = business ? null : result.data;

      // Backend protection: the INSERT must have bound THIS authenticated user
      // as owner. Never navigate on an unverified write — an owner mismatch or a
      // rejected insert keeps the user on the form with a visible error.
      if (saveError || (!business && (!inserted || inserted.owner_id !== userId))) {
        setError(tCommon("error"));
        return;
      }

      setSaved(true);
      router.refresh();
      if (successHref) localeRouter.push(successHref);
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
