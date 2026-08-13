import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { MessengerClient } from "@/components/messenger/messenger-client";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ conversation?: string | string[] }>;
};

export default async function MessengerPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("messenger");
  const user = await getCurrentUser();
  const sp = await searchParams;

  const conversationParam = Array.isArray(sp.conversation)
    ? sp.conversation[0]
    : sp.conversation;
  const initialConversationId =
    typeof conversationParam === "string" && conversationParam.length
      ? conversationParam
      : undefined;

  return (
    <main id="main-content" className="container-site py-6">
      <h1 className="text-2xl font-bold md:text-3xl">{t("title")}</h1>
      <div className="mt-6 h-[calc(100vh-10rem)] min-h-[540px]">
        <MessengerClient
          userId={user?.id ?? ""}
          initialConversationId={initialConversationId}
        />
      </div>
    </main>
  );
}