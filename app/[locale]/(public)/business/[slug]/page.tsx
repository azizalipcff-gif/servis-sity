import { notFound, permanentRedirect } from "next/navigation";
import { getBusinessBySlug } from "@/lib/queries";
import { businessPath } from "@/lib/business/url";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

/**
 * Legacy URL. Resolves the business (the old route had no city segment),
 * then issues a permanent 308 redirect to the canonical
 * /businesses/[city]/[slug] URL.
 */
export default async function LegacyBusinessPage({ params }: Props) {
  const { locale, slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();

  permanentRedirect(businessPath(locale, business));
}
