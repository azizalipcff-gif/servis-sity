"use client";

import { Building2, Lock, Package, TriangleAlert, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { EmptyCard } from "@/components/profile/empty-card";
import { deriveWorkspaceActions } from "@/lib/workspace/actions";

type WorkspaceEmptyStateProps = {
  hasBusiness: boolean;
  entity?: "overview" | "business" | "services" | "products";
  error?: string | null;
  loading?: boolean;
};

const RETRY_HREF = {
  overview: "/profile",
  business: "/profile",
  services: "/profile/services",
  products: "/profile/products",
} as const;

function PlusIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="size-4"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function LockedAction({ label }: { label: string }) {
  return (
    <Button
      disabled
      aria-disabled="true"
      className="opacity-60"
      title={label}
    >
      <Lock className="size-4" />
      {label}
    </Button>
  );
}

function ActiveAction({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild>
      <Link href={href}>
        <PlusIcon />
        {label}
      </Link>
    </Button>
  );
}

/**
 * Single source of truth for the workspace empty state.
 * Factory signals (`hasBusiness`, `error`, `loading`) are decided server-side;
 * this component derives the honest action states from them. An error is never
 * rendered as "create a business first", and a loading state is never rendered
 * as an empty business.
 */
export function WorkspaceEmptyState({
  hasBusiness,
  entity = "overview",
  error = null,
  loading = false,
}: WorkspaceEmptyStateProps) {
  const t = useTranslations("workspace");
  const tc = useTranslations("common");
  const actions = deriveWorkspaceActions({ hasBusiness, loading, error });

  if (loading) {
    return (
      <EmptyCard
        icon={<Wrench className="size-6" />}
        title={tc("loading")}
        description={t("business.emptyDesc")}
        action={
          <Button disabled aria-busy="true">
            {tc("loading")}
          </Button>
        }
      />
    );
  }

  if (error) {
    return (
      <EmptyCard
        icon={<TriangleAlert className="size-6" />}
        title={tc("errorTitle")}
        description={tc("errorBody")}
        action={
          <Button asChild variant="outline">
            <Link href={RETRY_HREF[entity]} scroll={false}>
              {tc("retry")}
            </Link>
          </Button>
        }
      />
    );
  }

  if (entity === "business") {
    const create = actions.createBusiness;
    return (
      <EmptyCard
        icon={<Building2 className="size-6" />}
        title={t("business.emptyTitle")}
        description={t("business.emptyDesc")}
        action={
          <ActiveAction
            href={create.href}
            label={
              create.kind === "manage"
                ? t("business.manage")
                : t("business.create")
            }
          />
        }
      />
    );
  }

  if (entity === "services") {
    const locked = actions.addService.kind === "businessRequired";
    return (
      <EmptyCard
        icon={<Wrench className="size-6" />}
        title={t("services.emptyTitle")}
        description={
          locked ? t("pagesServices.noBusinessDesc") : t("services.emptyDesc")
        }
        action={
          locked ? (
            <LockedAction label={t("services.add")} />
          ) : (
            <ActiveAction href={actions.addService.href} label={t("services.add")} />
          )
        }
      />
    );
  }

  if (entity === "products") {
    const locked = actions.addProduct.kind === "businessRequired";
    return (
      <EmptyCard
        icon={<Package className="size-6" />}
        title={t("products.emptyTitle")}
        description={
          locked ? t("pagesProducts.noBusinessDesc") : t("products.emptyDesc")
        }
        action={
          locked ? (
            <LockedAction label={t("products.add")} />
          ) : (
            <ActiveAction href={actions.addProduct.href} label={t("products.add")} />
          )
        }
      />
    );
  }

  // overview: one block. Create business is the primary CTA; services/products
  // stay locked until a business exists (or route to the dashboard once one does).
  const create = actions.createBusiness;
  const store = create.kind === "store";
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <EmptyCard
        icon={<Building2 className="size-6" />}
        title={t("business.emptyTitle")}
        description={t("business.emptyDesc")}
        className="lg:col-span-2"
        action={
          <ActiveAction
            href={create.href}
            label={store ? t("business.create") : t("business.manage")}
          />
        }
      />
      <EmptyCard
        icon={<Wrench className="size-6" />}
        title={t("services.emptyTitle")}
        description={
          store ? t("pagesServices.noBusinessDesc") : t("services.emptyDesc")
        }
        action={
          store ? (
            <LockedAction label={t("services.add")} />
          ) : (
            <ActiveAction
              href={actions.addService.href}
              label={t("services.add")}
            />
          )
        }
      />
      <EmptyCard
        icon={<Package className="size-6" />}
        title={t("products.emptyTitle")}
        description={
          store ? t("pagesProducts.noBusinessDesc") : t("products.emptyDesc")
        }
        action={
          store ? (
            <LockedAction label={t("products.add")} />
          ) : (
            <ActiveAction
              href={actions.addProduct.href}
              label={t("products.add")}
            />
          )
        }
      />
    </div>
  );
}