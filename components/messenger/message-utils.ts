/**
 * Pure helpers for messenger read-receipt derivation. Kept free of React /
 * next-intl imports so the node test-suite can exercise them directly.
 */

export type ReadReceiptInput = {
  sender_id: string;
  created_at: string;
  pending?: boolean;
};

/**
 * A message of mine counts as "seen" only when the peer's membership read
 * marker is at or after the message timestamp and the message is no longer
 * pending. Nothing in the app writes message_reads rows, so deriving from
 * last_read_at keeps the ✓✓ state truthful.
 */
export function deriveReadByPeer(
  msg: ReadReceiptInput,
  peerLastReadAt: string | null,
  me: string,
): boolean {
  if (msg.sender_id !== me) return false;
  if (msg.pending) return false;
  if (!peerLastReadAt) return false;
  return msg.created_at <= peerLastReadAt;
}
