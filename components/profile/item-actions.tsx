"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CardActionsMenu } from "@/components/dashboard/card-actions-menu";

type ItemActionsProps = {
  /** Which dashboard entity this menu acts on. */
  kind: "product" | "service" | "business";
  id: string;
  /** Human-readable item name (share title + delete confirmation). */
  itemName: string;
  /** Moderation status (products/services: published|archived; businesses: approved). */
  status: string;
  /** Owner edit route. */
  editHref: string;
  /** Public view route (only shown when the item is publicly visible). */
  viewHref?: string;
  /** Public share path (only shown when the item is publicly visible). */
  shareUrl?: string;
  /** Whether Delete should be offered (archived/rejected items). */
  canDelete: boolean;
  /** Reuses the existing `featured` flag for Pin (products/services only). */
  enablePin?: boolean;
  pinned?: boolean;
  /** API base used for DELETE / PATCH, e.g. /api/dashboard/products. */
  apiBase: string;
};

export function ItemActions({
  kind,
  id,
  itemName,
  status,
  editHref,
  viewHref,
  shareUrl,
  canDelete,
  enablePin = false,
  pinned = false,
  apiBase,
}: ItemActionsProps) {
  const router = useRouter();
  const tActions = useTranslations("actions");
  const tDialog = useTranslations(kind === "service" ? "dashboard" : "products");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmOpen(false);
        router.refresh();
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(tActions("deleteFailed"));
        if (data?.error) console.error("[ItemActions] delete failed:", data.error);
      }
    } catch {
      setError(tActions("deleteFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function togglePin() {
    setPinning(true);
    try {
      const res = await fetch(`${apiBase}/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ featured: !pinned }),
      });
      if (res.ok) router.refresh();
    } catch {
      /* no-op: visible feedback handled later */
    } finally {
      setPinning(false);
    }
  }

  return (
    <>
      <CardActionsMenu
        itemName={itemName}
        status={status}
        editHref={editHref}
        viewHref={viewHref}
        shareUrl={shareUrl}
        canDelete={canDelete}
        onDelete={() => setConfirmOpen(true)}
        pinned={enablePin ? pinned : undefined}
        onTogglePin={enablePin ? togglePin : undefined}
        pinning={pinning}
      />
      {canDelete ? (
        <ConfirmDialog
          open={confirmOpen}
          title={
            kind === "service" ? tDialog("deleteServiceTitle") : tDialog("deleteTitle")
          }
          description={
            error ?? tActions("deleteConfirmation", { name: itemName })
          }
          confirmLabel={kind === "service" ? tDialog("deleteService") : tDialog("delete")}
          cancelLabel={tDialog("cancelDelete")}
          busy={busy}
          onConfirm={confirmDelete}
          onCancel={() => {
            setError(null);
            setConfirmOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
