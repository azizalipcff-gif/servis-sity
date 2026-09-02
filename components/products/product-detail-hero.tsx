"use client";

import { motion } from "framer-motion";
import {
  BadgeCheck,
  Bookmark,
  Loader2,
  MapPin,
  MessageCircle,
  MessageSquare,
  Package,
  Share,
  ShoppingBag,
  Star,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBusinessChat } from "@/components/business/use-business-chat";
import { useFavorite } from "@/components/favorites/use-favorite";
import { SmartImage } from "@/components/smart-image";
import { Button } from "@/components/ui/button";
import { DEFAULT_PLACEHOLDER_IMAGES } from "@/lib/constants";
import { businessHref } from "@/lib/business/url";
import { formatPrice, type Locale } from "@/lib/translations";
import { cn } from "@/lib/utils";
import type { ProductDetail } from "@/lib/queries";
import { buildWhatsAppUrl, isWhatsAppEnabled } from "@/lib/whatsapp";
import { trackLead } from "@/lib/analytics/client";
import { OwnerProfileHover } from "@/components/profile/owner-profile-hover";

export function ProductDetailHero({ product }: { product: ProductDetail }) {
  const t = useTranslations("business");
  const tp = useTranslations("product");
  const tS = useTranslations("search");
  const locale = useLocale() as Locale;

  const biz = product.business;
  const whatsappEnabled = isWhatsAppEnabled(biz ?? {});
  const whatsappLink = buildWhatsAppUrl(biz ?? {});

  const { startChat, busy: chatBusy, isOwner } = useBusinessChat(
    biz?.id ?? "",
    biz?.owner_id ?? null,
    biz?.slug ?? "",
    biz?.slug ? businessHref(biz) : undefined,
  );
  const { saved, toggle, busy: favBusy } = useFavorite("product", product.id);

  const outOfStock = product.stock <= 0;
  const hasDiscount = product.compare_at_price != null && product.compare_at_price > product.price;
  const discountPct = hasDiscount && product.compare_at_price
    ? Math.round((1 - product.price / product.compare_at_price) * 100)
    : 0;

  const cover = product.images?.[0];

  async function onShare() {
    const url = `${window.location.origin}/${locale}/product/${product.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else await navigator.clipboard.writeText(url);
    } catch {
      /* user cancelled */
    }
  }

  return (
    <>
      <section className="relative h-[300px] overflow-hidden bg-muted sm:h-[400px] lg:h-[460px]">
        <div className="absolute inset-0">
          <SmartImage
            src={cover}
            alt={product.name}
            fallback={DEFAULT_PLACEHOLDER_IMAGES.business}
            sizes="100vw"
            className="h-full w-full"
            priority
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 z-10">
          <div className="flex flex-col justify-end gap-3 px-6 pb-6 sm:px-8 md:pb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex items-start gap-4"
            >
              <div className="grid size-16 shrink-0 place-items-center rounded-xl border-2 border-white bg-black/30 shadow-lg backdrop-blur md:size-20">
                <Package className="size-8 text-white md:size-10" />
              </div>

              <div className="min-w-0 flex-1 text-white">
                <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white ring-1 ring-white/40 backdrop-blur">
                  <ShoppingBag className="me-1 size-3" />
                  {tS("entityProduct")}
                </span>
                <h1 className="mt-2 min-w-0 break-words text-2xl font-bold leading-tight text-white md:text-4xl">
                  {product.name}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-white/90">
                  {biz && (
                    <OwnerProfileHover ownerId={biz.owner_id} businessName={biz.name}>
                      <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-white hover:underline">
                        <span className="line-clamp-1">{biz.name}</span>
                        {biz.verified && <BadgeCheck className="size-4 shrink-0" />}
                      </span>
                    </OwnerProfileHover>
                  )}
                  {biz?.city && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5" />
                      {biz.city}
                    </span>
                  )}
                  {(biz?.rating_avg ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Star className="size-4 fill-gold text-gold" />
                      <span className="font-semibold text-white">{(biz?.rating_avg ?? 0).toFixed(1)}</span>
                    </span>
                  )}
                </div>

                <p className={cn("mt-1.5 text-xs font-semibold", outOfStock ? "text-red-200" : "text-emerald-200")}>
                  {outOfStock ? tp("outOfStock") : tp("inStock")}
                </p>
              </div>

              <div className="shrink-0 rounded-xl border border-white/30 bg-black/30 px-3 py-2 text-end shadow-lg backdrop-blur md:px-4 md:py-2.5">
                <p className="text-xl font-bold tabular-nums tracking-tight text-white md:text-2xl">
                  {formatPrice(product.price, locale)}
                </p>
                {hasDiscount && product.compare_at_price && (
                  <s className="text-xs tabular-nums text-white/70">{formatPrice(product.compare_at_price, locale)}</s>
                )}
                {hasDiscount && (
                  <span className="mt-0.5 inline-flex items-center rounded-sm bg-gold px-1.5 py-0.5 text-[11px] font-bold leading-none text-black">
                    −{discountPct}%
                  </span>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="border-b border-border bg-background">
        <div className="container-site flex items-center gap-2 overflow-x-auto whitespace-nowrap py-3 scrollbar-none">
          <Button type="button" className="h-11 shrink-0" disabled={chatBusy || isOwner} onClick={() => void startChat()}>
            {chatBusy ? <Loader2 className="size-4 animate-spin" /> : <MessageSquare className="size-4" />}
            {t("chat")}
          </Button>

          {whatsappEnabled && whatsappLink && (
            <Button asChild variant="outline" className="h-11 shrink-0">
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" onClick={() => biz?.id && trackLead(biz.id, "whatsapp")}>
                <MessageCircle className="size-4" />
                {t("whatsapp")}
              </a>
            </Button>
          )}

          <Button variant="outline" type="button" className="h-11 shrink-0" aria-pressed={saved} disabled={favBusy} onClick={toggle}>
            <Bookmark className={cn("size-4", saved && "fill-primary text-primary")} />
            {saved ? tp("saved") : tp("save")}
          </Button>

          <Button variant="ghost" type="button" className="h-11 shrink-0" onClick={onShare}>
            <Share className="size-4" />
            {t("detail.share")}
          </Button>
        </div>
      </div>
    </>
  );
}
