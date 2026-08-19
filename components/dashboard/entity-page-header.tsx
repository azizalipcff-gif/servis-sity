import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function EntityPageHeader({
  backHref,
  backLabel,
  title,
  description,
  eyebrow,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  description: string;
  eyebrow?: string;
}) {
  return (
    <div className="space-y-5">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" />
        {backLabel}
      </Link>

      <div className="space-y-1.5">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-editorial text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
      </div>
    </div>
  );
}