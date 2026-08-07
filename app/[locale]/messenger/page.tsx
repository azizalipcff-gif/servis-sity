import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { MessengerClient } from "@/components/messenger/messenger-client";

export const dynamic = "force-dynamic";

export default async function MessengerPage() {
  const t = await getTranslations("messenger");
  const user = await getCurrentUser();

  return (
    <main className="container-site py-6">
      <h1 className="text-2xl font-bold md:text-3xl">{t("title")}</h1>
      <div className="mt-6 h-[calc(100vh-10rem)] min-h-[540px]">
        <MessengerClient userId={user?.id ?? ""} />
      </div>
    </main>
  );
}