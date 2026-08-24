"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Eye,
  Loader2,
  MoreVertical,
  Pencil,
  Pin,
  PinOff,
  Share2,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useShare } from "@/lib/hooks/use-share";
import { cn } from "@/lib/utils";

type CardActionsMenuProps = {
  /** Human-readable item name, used for the share title and delete confirmation. */
  itemName: string;
  /** Item moderation status (e.g. "published" | "archived" | "approved"). */
  status: string;
  /** Dashboard edit route. Always available to the owner. */
  editHref: string;
  /** Public view route — only supplied when the item is publicly visible. */
  viewHref?: string;
  /** Public share path — only supplied when the item is publicly visible. */
  shareUrl?: string;
  /** Whether the Delete action should be offered (archived/rejected items). */
  canDelete: boolean;
  /** Opens the existing confirmation dialog (required when `canDelete` is true). */
  onDelete?: () => void;
  /** Surfaces share/pin feedback in the parent list's banner. */
  onNotify?: (message: string, kind?: "success" | "error") => void;
  /** Disables the Delete item while the deletion is in flight. */
  deleting?: boolean;
  /** When provided, a Pin/Unpin item is shown (reuses the existing `featured` flag). */
  pinned?: boolean;
  onTogglePin?: () => void;
  pinning?: boolean;
  /** Extra classes for the absolute overlay wrapper (positioning context). */
  className?: string;
};

export function CardActionsMenu({
  itemName,
  status,
  editHref,
  viewHref,
  shareUrl,
  canDelete,
  onDelete,
  onNotify,
  deleting,
  pinned,
  onTogglePin,
  pinning,
  className,
}: CardActionsMenuProps) {
  const t = useTranslations("actions");
  const locale = useLocale();
  const { share } = useShare();

  // Publicly visible items: products/services "published", businesses "approved".
  const isPublic = status === "published" || status === "approved";
  const showView = isPublic && Boolean(viewHref);
  const showShare = isPublic && Boolean(shareUrl);

  async function handleShare() {
    if (!shareUrl) return;
    const absolute =
      typeof window !== "undefined"
        ? `${window.location.origin}/${locale}${shareUrl}`
        : `/${locale}${shareUrl}`;
    const result = await share({ title: itemName, url: absolute });
    if (result === "failed") {
      onNotify?.(t("shareFailed"), "error");
    } else {
      onNotify?.(result === "shared" ? t("shareSuccess") : t("linkCopied"), "success");
    }
  }

  return (
    <div className={cn("absolute right-2 top-2 z-20", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="iconSm"
            className="h-10 w-10 rounded-full bg-black/45 text-white shadow-sm backdrop-blur transition-colors hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label={t("moreActions")}
            title={t("moreActions")}
          >
            <MoreVertical className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {onTogglePin ? (
            <DropdownMenuItem
              disabled={pinning}
              onSelect={(event) => {
                event.preventDefault();
                onTogglePin();
              }}
            >
              {pinning ? (
                <Loader2 className="size-4 animate-spin" />
              ) : pinned ? (
                <PinOff className="size-4" />
              ) : (
                <Pin className="size-4" />
              )}
              {pinned ? t("unpin") : t("pin")}
            </DropdownMenuItem>
          ) : null}

          {showView ? (
            <DropdownMenuItem asChild>
              <Link href={viewHref as string}>
                <Eye className="size-4" />
                {t("view")}
              </Link>
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuItem asChild>
            <Link href={editHref}>
              <Pencil className="size-4" />
              {t("edit")}
            </Link>
          </DropdownMenuItem>

          {showShare ? (
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                void handleShare();
              }}
            >
              <Share2 className="size-4" />
              {t("share")}
            </DropdownMenuItem>
          ) : null}

          {canDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                disabled={deleting}
                onSelect={(event) => {
                  event.preventDefault();
                  onDelete?.();
                }}
              >
                {deleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                {t("delete")}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
