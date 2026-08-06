import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("common");

  return (
    <div className="container-site flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="text-lg font-semibold">{t("notFoundTitle")}</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t("notFoundDescription")}
      </p>
      <Link href="/">
        <Button>{t("back")}</Button>
      </Link>
    </div>
  );
}
