import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

type CatalogPaginationProps = {
  currentPage: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
  label?: string;
};

function pageItems(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("ellipsis");
  for (let page = start; page <= end; page++) pages.push(page);
  if (end < total - 1) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

export function CatalogPagination({
  currentPage,
  totalPages,
  hrefForPage,
  label = "Pagination",
}: CatalogPaginationProps) {
  if (totalPages <= 1) return null;
  const items = pageItems(currentPage, totalPages);

  return (
    <nav
      aria-label={label}
      className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
    >
      <Link
        href={hrefForPage(Math.max(1, currentPage - 1))}
        aria-label="Previous page"
        aria-disabled={currentPage === 1}
        tabIndex={currentPage === 1 ? -1 : undefined}
        className={`inline-flex size-10 items-center justify-center rounded-xl border text-sm transition-colors ${
          currentPage === 1
            ? "pointer-events-none border-border/60 text-muted-foreground/40"
            : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted"
        }`}
      >
        <ChevronLeft className="size-4" />
      </Link>

      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="inline-flex size-10 items-center justify-center text-sm text-muted-foreground"
            aria-hidden
          >
            …
          </span>
        ) : (
          <Link
            key={item}
            href={hrefForPage(item)}
            aria-current={item === currentPage ? "page" : undefined}
            className={`inline-flex size-10 items-center justify-center rounded-xl border text-sm font-medium transition-colors ${
              item === currentPage
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted"
            }`}
          >
            {item}
          </Link>
        ),
      )}

      <Link
        href={hrefForPage(Math.min(totalPages, currentPage + 1))}
        aria-label="Next page"
        aria-disabled={currentPage === totalPages}
        tabIndex={currentPage === totalPages ? -1 : undefined}
        className={`inline-flex size-10 items-center justify-center rounded-xl border text-sm transition-colors ${
          currentPage === totalPages
            ? "pointer-events-none border-border/60 text-muted-foreground/40"
            : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted"
        }`}
      >
        <ChevronRight className="size-4" />
      </Link>
    </nav>
  );
}
