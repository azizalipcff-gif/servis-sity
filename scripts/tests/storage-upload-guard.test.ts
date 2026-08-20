/**
 * SEC-12 — Storage upload caps regression tests.
 *
 * Verifies migration 0033_storage_upload_guard.sql applies a HARD server-side
 * size cap to every object bucket the app writes to (closing the proven
 * client-cap bypass), and that those caps are always set ABOVE the app's own
 * legitimate client-side ceilings — so the security fix never breaks a working
 * upload flow. Also verifies image/verification buckets restrict MIME while
 * the `attachments` bucket keeps arbitrary document exchange (no mime list).
 *
 * SECURITY CONTEXT: client-side caps only, no server or RLS check on object
 * size/content. Proof: a fresh signed-in account uploaded a 32 MB object into
 * the public `attachments` bucket and a 12 MB object into `business-gallery`
 * (app cap 6 MB) — both accepted and publicly served.
 *
 * Run: node scripts/tests/storage-upload-guard.test.ts
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { run, finish, assert, assertEqual } from "./suite.ts";

const MIGRATION_PATH = fileURLToPath(
  new URL("../../supabase/migrations/0033_storage_upload_guard.sql", import.meta.url),
);
const rawSql = readFileSync(MIGRATION_PATH, "utf8");
/** Drop comment lines (they may contain `update storage.buckets` text that
 *  would otherwise be mistaken for a statement). */
const sql = rawSql
  .split(/\r?\n/)
  .filter((line) => !/^\s*--/.test(line))
  .join("\n");

/** App-side legitimate ceilings (the values the server cap must stay above). */
const CLIENT_CEILINGS: Record<string, number> = {
  attachments: 25 * 1024 * 1024, // components/messenger/upload.ts (MESSENGER_MAX_FILE_BYTES)
  "business-logos": 3 * 1024 * 1024, // lib/uploads/config.ts
  "business-covers": 6 * 1024 * 1024,
  "business-gallery": 6 * 1024 * 1024,
  "user-avatars": 2 * 1024 * 1024,
  "category-images": 4 * 1024 * 1024,
  "verification-documents": 5 * 1024 * 1024, // lib/verification/docs.ts (VERIFICATION_MAX_SIZE_BYTES)
};

/** Buckets that MUST restrict content type (the app itself only accepts these). */
const MIME_RESTRICTED_BUCKETS = [
  "business-logos",
  "business-covers",
  "business-gallery",
  "user-avatars",
  "category-images",
  "business-media",
  "verification-documents",
];

const MB = 1024 * 1024;

type BucketSetting = {
  fileSizeLimit: number;
  allowedMimeTypes: string[] | null;
};

function parseMigration(text: string): Map<string, BucketSetting> {
  const out = new Map<string, BucketSetting>();
  const blocks = text.split(/update\s+storage\.buckets/i).slice(1);
  for (const block of blocks) {
    const idMatch = /where id = '([^']+)'/i.exec(block);
    const sizeMatch = /file_size_limit\s*=\s*(\d+)\s*\*\s*(\d+)\s*\*\s*(\d+)/i.exec(block);
    if (!idMatch) continue;
    const mimes = /array\[([^\]]*)\]/.exec(block);
    out.set(idMatch[1], {
      fileSizeLimit: sizeMatch ? evalSizeExpr(sizeMatch) : 0,
      allowedMimeTypes: mimes
        ? mimes[1].split(",").map((m) => m.trim().replace(/^'|'$/g, "")).filter(Boolean)
        : null,
    });
  }
  return out;
}

function evalSizeExpr(match: RegExpExecArray): number {
  return Number(match[1]) * Number(match[2]) * Number(match[3]);
}

const settings = parseMigration(sql);

await run("SEC-12: migration applies a size cap to every app-writable bucket", () => {
  for (const bucket of Object.keys(CLIENT_CEILINGS)) {
    const setting = settings.get(bucket);
    assert(setting, `bucket '${bucket}' has no file_size_limit in the migration`);
    assert(setting!.fileSizeLimit > 0, `bucket '${bucket}' cap missing`);
  }
});

await run("SEC-12: server cap sits ABOVE every client-side legit ceiling (no business break)", () => {
  for (const [bucket, ceiling] of Object.entries(CLIENT_CEILINGS)) {
    const setting = settings.get(bucket)!;
    assert(
      setting.fileSizeLimit >= ceiling,
      `bucket '${bucket}': server cap ${setting.fileSizeLimit} < client ceiling ${ceiling}`,
    );
  }
});

await run("SEC-12: oversized uploads are now impossible (cap is bounded, not open-ended)", () => {
  for (const [bucket, setting] of settings) {
    assert(
      setting.fileSizeLimit <= 32 * MB,
      `bucket '${bucket}': cap ${setting.fileSizeLimit} exceeds 32 MB (the proven abuse size)`,
    );
  }
});

await run("SEC-12: image + verification buckets restrict MIME types", () => {
  for (const bucket of MIME_RESTRICTED_BUCKETS) {
    const setting = settings.get(bucket);
    assert(setting && setting.allowedMimeTypes && setting.allowedMimeTypes.length > 0,
      `bucket '${bucket}' must restrict allowed mime types`);
  }
});

await run("SEC-12: attachments keeps arbitrary document exchange (no mime list, but size-capped)", () => {
  const setting = settings.get("attachments");
  assert(setting, "attachments bucket cap missing");
  assertEqual(setting!.allowedMimeTypes, null, "attachments must NOT whitelist mime types");
  assert(setting!.fileSizeLimit >= 25 * MB, "attachments cap must allow legit 25 MB files");
});

await run("SEC-12: verification-documents mime list matches the app allow-list", () => {
  const setting = settings.get("verification-documents")!;
  for (const m of ["application/pdf", "image/png", "image/jpeg"]) {
    assert(setting.allowedMimeTypes!.includes(m), `verification-documents must allow ${m}`);
  }
});

await finish();