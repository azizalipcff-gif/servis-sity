import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getAdminUsers } from "@/lib/queries";
import { UsersTable } from "@/components/admin/users-table";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminUsersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("admin");
  const users = await getAdminUsers();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("users")}</h2>
      <UsersTable users={users} />
    </div>
  );
}
