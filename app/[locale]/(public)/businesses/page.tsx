import { permanentRedirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

/**
 * Backward-compatible catalog entrypoint.
 * Business detail pages live under /businesses/[city]/[slug], while the
 * marketplace catalog itself is /business. Keep /businesses as a safe alias
 * so older links never land on a 404.
 */
export default async function BusinessesAliasPage({ params }: Props) {
  const { locale } = await params;
  permanentRedirect(`/${locale}/business`);
}
