/**
 * Build the database patch for an admin service/product moderation action.
 *
 * Only `status` is written to the `services`/`products` tables. The
 * `status_note` (rejection reason) is intentionally NOT included here because
 * those columns do not exist in the live database; the note is preserved
 * separately in `audit_logs` metadata by the calling route.
 */
export function buildModerationPatch(status: string): { status: string } {
  return { status };
}
