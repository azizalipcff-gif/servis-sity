/**
 * Pure, canonical workspace-ownership derivation. The web layer uses this
 * inside getWorkspaceState; tests exercise it directly
 * (scripts/tests/workspace-state.test.ts).
 *
 * Ownership rule (never weakened, enforced by RLS AND re-derived here):
 * a business counts towards the workspace only when
 *   business.owner_id === authenticated user id.
 *
 * An error is NEVER treated as "no business" — loaders at the call site
 * distinguish QUERY_ERROR / LOADING / NO_BUSINESS.
 */

export type OwnedRow = { id: string; owner_id: string };

export type WorkspaceOwnershipState<B extends OwnedRow = OwnedRow> = {
  businesses: B[];
  hasBusiness: boolean;
  error: string | null;
};

export function deriveWorkspaceState<B extends OwnedRow>(input: {
  userId: string;
  businesses: B[];
  error?: string | null;
}): WorkspaceOwnershipState<B> {
  if (input.error) {
    return { businesses: [], hasBusiness: false, error: input.error };
  }
  const businesses = input.businesses.filter(
    (b) => b.owner_id === input.userId,
  );
  return { businesses, hasBusiness: businesses.length > 0, error: null };
}