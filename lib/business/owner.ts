/**
 * Owner-identity resolution for business creation.
 *
 * The authenticated session (`auth.uid()`) is the ONLY authority for who owns a
 * business. The browser client that performs the INSERT enforces ownership via
 * the RLS WITH CHECK `owner_id = auth.uid()`, so the value we persist MUST equal
 * that session id. We therefore resolve owner_id from the live session and never
 * from a prop, a request field, or an empty string — and we fail closed when no
 * identity is present so an unauthenticated request can never create a Business
 * with an empty or invalid owner_id.
 */

export class OwnerIdentityError extends Error {
  constructor() {
    super("A signed-in user is required to create a business.");
    this.name = "OwnerIdentityError";
  }
}

export function resolveOwnerId(authUserId: string | null | undefined): string {
  if (!authUserId) throw new OwnerIdentityError();
  return authUserId;
}
