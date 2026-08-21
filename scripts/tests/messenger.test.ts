/**
 * MESSENGER — regression tests for the chat upgrade.
 * Covers the pure logic that failed or was missing before:
 *  - safe link/attachment rendering (stored-XSS defense in depth)
 *  - URL segmentation for linkified message bodies
 *  - read-receipt derivation from the peer's last_read_at marker
 *
 * Run: node scripts/tests/messenger.test.ts
 */

import { run, finish, assertEqual, assertDeep } from "./suite.ts";
import { linkifySegments, safeHref } from "../../components/messenger/linkify.ts";
import { deriveReadByPeer } from "../../components/messenger/message-utils.ts";

// --- safeHref: only http(s) may become a clickable href --------------------

await run("MESSENGER: safeHref accepts https attachment URLs", () => {
  const url = "https://xyz.supabase.co/storage/v1/object/public/attachments/u/a.png";
  assertEqual(safeHref(url), url);
});

await run("MESSENGER: safeHref accepts plain http", () => {
  assertEqual(safeHref("http://example.com/a.pdf"), "http://example.com/a.pdf");
});

await run("MESSENGER: safeHref rejects javascript: URLs (XSS)", () => {
  assertEqual(safeHref("javascript:alert(document.domain)"), "");
});

await run("MESSENGER: safeHref rejects data: URLs", () => {
  assertEqual(safeHref("data:text/html;base64,PHNjcmlwdD4="), "");
});

await run("MESSENGER: safeHref rejects vbscript: and unknown schemes", () => {
  assertEqual(safeHref("vbscript:msgbox"), "");
  assertEqual(safeHref("file:///C:/Windows/system32"), "");
});

await run("MESSENGER: safeHref rejects garbage / protocol-relative", () => {
  assertEqual(safeHref("not a url"), "");
  assertEqual(safeHref("//evil.example.com/payload"), "");
  assertEqual(safeHref(""), "");
});

// --- linkifySegments: bodies split into text + link runs -------------------

await run("MESSENGER: plain body stays one text segment", () => {
  assertDeep(linkifySegments("Salam, service disponible?"), [
    { kind: "text", value: "Salam, service disponible?" },
  ]);
});

await run("MESSENGER: URL inside body becomes a link segment", () => {
  const segs = linkifySegments("See https://example.com/x for details");
  assertDeep(segs, [
    { kind: "text", value: "See " },
    { kind: "link", value: "https://example.com/x" },
    { kind: "text", value: " for details" },
  ]);
});

await run("MESSENGER: multiple URLs all captured", () => {
  const segs = linkifySegments("https://a.io http://b.io");
  assertEqual(segs.filter((s) => s.kind === "link").length, 2);
});

await run("MESSENGER: bare domains are NOT linkified (needs scheme)", () => {
  assertDeep(linkifySegments("visit example.com please"), [
    { kind: "text", value: "visit example.com please" },
  ]);
});

await run("MESSENGER: empty body yields single empty text segment", () => {
  assertDeep(linkifySegments(""), [{ kind: "text", value: "" }]);
});

// --- deriveReadByPeer: truthful ✓✓ from last_read_at -----------------------

const ME = "user-me";
const PEER_READ_AT = "2026-08-21T12:00:00Z";

await run("MESSENGER: my message before peer's read marker is seen", () => {
  assertEqual(
    deriveReadByPeer(
      { sender_id: ME, created_at: "2026-08-21T11:30:00Z" },
      PEER_READ_AT,
      ME,
    ),
    true,
  );
});

await run("MESSENGER: my message exactly at the marker counts as seen", () => {
  assertEqual(
    deriveReadByPeer({ sender_id: ME, created_at: PEER_READ_AT }, PEER_READ_AT, ME),
    true,
  );
});

await run("MESSENGER: my message newer than the marker is not seen yet", () => {
  assertEqual(
    deriveReadByPeer(
      { sender_id: ME, created_at: "2026-08-21T13:00:00Z" },
      PEER_READ_AT,
      ME,
    ),
    false,
  );
});

await run("MESSENGER: pending messages never show as seen", () => {
  assertEqual(
    deriveReadByPeer(
      { sender_id: ME, created_at: "2026-08-21T13:00:00Z", pending: true },
      PEER_READ_AT,
      ME,
    ),
    false,
  );
});

await run("MESSENGER: incoming messages never show my ✓✓", () => {
  assertEqual(
    deriveReadByPeer(
      { sender_id: "user-peer", created_at: "2026-08-21T13:00:00Z" },
      PEER_READ_AT,
      ME,
    ),
    false,
  );
});

await run("MESSENGER: no read marker yet -> nothing seen", () => {
  assertEqual(
    deriveReadByPeer(
      { sender_id: ME, created_at: "2026-08-21T13:00:00Z" },
      null,
      ME,
    ),
    false,
  );
});

await finish();
