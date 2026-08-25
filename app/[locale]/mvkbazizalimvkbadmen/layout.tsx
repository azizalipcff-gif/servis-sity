import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "@/components/admin/admin-nav";
import type { Locale } from "@/lib/translations";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const guard = await requireAdmin();
  if (!guard) {
    redirect({ href: "/", locale: locale as Locale });
    return null;
  }
  const admin = guard.admin;

  const t = await getTranslations("admin");

  const [pendingBiz, pendingSvc, pendingPrd] = await Promise.all([
    guard.supabase
      .from("businesses")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review"),
    guard.supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review"),
    guard.supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review"),
  ]);

  const pendingCounts = {
    businesses: pendingBiz.count ?? 0,
    services: pendingSvc.count ?? 0,
    products: pendingPrd.count ?? 0,
  };

  return (
    <div
      className="container-site py-8"
      style={{ direction: locale === "ar" ? "rtl" : "ltr" }}
    >
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("dashboard")}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <span className="size-2 rounded-full bg-success" />
          {admin.full_name ?? "Admin"}
        </div>
      </header>

      <AdminNav pendingCounts={pendingCounts} />

      <main id="main-content" className="mt-6">{children}</main>
    </div>
  );
}