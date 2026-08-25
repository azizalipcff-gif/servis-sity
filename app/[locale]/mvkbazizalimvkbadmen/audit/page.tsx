import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { ShieldAlert } from "lucide-react";
import { getAuditLogs } from "@/lib/queries";
import type { Locale } from "@/lib/translations";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminAuditPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("admin");
  const entries = await getAuditLogs(100);
  const loc = locale as Locale;

  const fmt = new Intl.DateTimeFormat(loc === "ar" ? "ar-MA" : loc, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const reasonOf = (e: (typeof entries)[number]) =>
    (e.metadata?.note as string | undefined) ??
    (e.metadata?.reason as string | undefined) ??
    null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">{t("audit")}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{t("operational")}</p>

      <div className="overflow-x-auto rounded-3xl border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{t("action")}</th>
              <th className="px-4 py-3">{t("entity")}</th>
              <th className="px-4 py-3">{t("actor")}</th>
              <th className="px-4 py-3">{t("reason")}</th>
              <th className="px-4 py-3">{t("date")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="align-top">
                  <td className="px-4 py-3 font-medium">{e.action}</td>
                  <td className="px-4 py-3">
                    <span className="text-muted-foreground">{e.target_type}</span>
                    {e.target_id ? (
                      <span className="ml-1 font-mono text-xs">{e.target_id.slice(0, 8)}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{e.actor_id?.slice(0, 8) ?? "—"}</td>
                  <td className="px-4 py-3 max-w-[280px] truncate text-muted-foreground">
                    {reasonOf(e) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {fmt.format(new Date(e.created_at))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
