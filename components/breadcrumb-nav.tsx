import { Home, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export type Crumb = { label: string; href?: string };

export async function BreadcrumbNav({ items }: { items: Crumb[] }) {
  const t = await getTranslations("nav");
  return (
    <nav
      aria-label="Breadcrumb"
      className="container-site flex items-center gap-2 py-4 text-[13px] text-muted-foreground"
    >
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
      >
        <Home className="size-3.5" />
        <span>{t("home")}</span>
      </Link>
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="inline-flex items-center gap-2">
          <ChevronRight
            className="size-3.5 shrink-0 text-muted-foreground/60 rtl:rotate-180"
            aria-hidden
          />
          {item.href ? (
            <Link
              href={item.href}
              className="max-w-44 truncate transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ) : (
            <span className="max-w-44 truncate text-foreground/80">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
