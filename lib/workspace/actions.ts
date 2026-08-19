/**
 * Pure derivation of the workspace action states. No context, no I/O — honest
 * inputs in, honest states out. Covered by scripts/tests/workspace-state.test.ts.
 *
 * Canonical action destinations live here so every Profile/Workspace surface
 * (empty states, header dialog, pages) shares the exact same href and it can be
 * asserted in tests. Note the i18n <Link> prepends the locale at navigation.
 */

export const WORKSPACE_CREATE_BUSINESS_HREF = "/dashboard/business/new";
export const WORKSPACE_MANAGE_BUSINESS_HREF = "/dashboard";
export const WORKSPACE_ADD_SERVICE_HREF = "/dashboard/services/new";
export const WORKSPACE_ADD_PRODUCT_HREF = "/dashboard/products/new";

export type WorkspaceSignal = {
  hasBusiness: boolean;
  loading?: boolean;
  error?: string | null;
};

export type WorkspaceActionKind =
  | "active" // go: business exists, action is fully available
  | "store" // go: create business (primary onboarding CTA)
  | "manage" // go: business exists, route to the dashboard
  | "businessRequired" // locked: officially needs a business first
  | "error" // retry: something failed, do not mislead the user
  | "loading"; // disabled: pending, never flash a wrong empty state

export type WorkspaceAction = { kind: WorkspaceActionKind; href: string };

export type WorkspaceActionDerivation = {
  createBusiness: WorkspaceAction;
  addService: WorkspaceAction;
  addProduct: WorkspaceAction;
};

export function deriveWorkspaceActions({
  hasBusiness,
  loading = false,
  error = null,
}: WorkspaceSignal): WorkspaceActionDerivation {
  // A query error is NOT evidence that no services/products exist. Show a
  // retry, never the misleading "create a business first" lock.
  if (error) {
    return {
      createBusiness: {
        kind: hasBusiness ? "manage" : "store",
        href: hasBusiness
          ? WORKSPACE_MANAGE_BUSINESS_HREF
          : WORKSPACE_CREATE_BUSINESS_HREF,
      },
      addService: { kind: "error", href: WORKSPACE_ADD_SERVICE_HREF },
      addProduct: { kind: "error", href: WORKSPACE_ADD_PRODUCT_HREF },
    };
  }

  // While loading, actions are disabled — flashing "create business first"
  // before we know the answer would be dishonest.
  if (loading) {
    return {
      createBusiness: { kind: "loading", href: WORKSPACE_CREATE_BUSINESS_HREF },
      addService: { kind: "loading", href: WORKSPACE_ADD_SERVICE_HREF },
      addProduct: { kind: "loading", href: WORKSPACE_ADD_PRODUCT_HREF },
    };
  }

  if (!hasBusiness) {
    return {
      createBusiness: { kind: "store", href: WORKSPACE_CREATE_BUSINESS_HREF },
      addService: { kind: "businessRequired", href: WORKSPACE_ADD_SERVICE_HREF },
      addProduct: { kind: "businessRequired", href: WORKSPACE_ADD_PRODUCT_HREF },
    };
  }

  return {
    createBusiness: { kind: "manage", href: WORKSPACE_MANAGE_BUSINESS_HREF },
    addService: { kind: "active", href: WORKSPACE_ADD_SERVICE_HREF },
    addProduct: { kind: "active", href: WORKSPACE_ADD_PRODUCT_HREF },
  };
}