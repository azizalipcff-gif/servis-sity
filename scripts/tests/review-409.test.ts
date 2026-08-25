/**
 * Review 409 / duplicate-review UI error-handling test.
 *
 * The /api/reviews route intentionally returns 409 {"error":"already_reviewed"}
 * when a user submits a second review for the same business (the unique
 * (business_id, user_id) constraint raises Postgres 23505, which the route
 * maps to 409). The client must surface that as a clear, specific message
 * (t("alreadyReviewed")) instead of the generic "Something went wrong".
 *
 * This test guards that the specific message key exists (and is distinct from
 * the generic fallback) in every supported locale, so the UI error handling
 * renders the right copy. Requires no running server.
 *
 * Run: node scripts/tests/review-409.test.ts
 */
import { run, finish, assert } from "./suite.ts";
import { readFileSync } from "node:fs";

type Messages = Record<string, unknown>;

function loadMessages(locale: string): Messages {
  return JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Messages;
}

function getKey(messages: Messages, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[k];
    return undefined;
  }, messages);
}

const locales = ["en", "fr", "ar"] as const;

(async () => {
  for (const locale of locales) {
    await run(`review-409: business.alreadyReviewed key present (${locale})`, () => {
      const messages = loadMessages(locale);
      const msg = getKey(messages, "business.alreadyReviewed");
      assert(typeof msg === "string" && msg.trim().length > 0, `business.alreadyReviewed must be a non-empty string in ${locale}`);
    });

    await run(`review-409: duplicate message is distinct from generic fallback (${locale})`, () => {
      const messages = loadMessages(locale);
      const dup = getKey(messages, "business.alreadyReviewed");
      const generic = getKey(messages, "business.bookingFailed");
      assert(
        typeof dup === "string" && typeof generic === "string" && dup !== generic,
        `alreadyReviewed must differ from the generic bookingFailed message in ${locale}`,
      );
    });
  }

  await finish();
})();
