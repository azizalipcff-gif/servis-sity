/**
 * SEC-3 — Same-origin guard regression tests.
 * Verifies assertSameOrigin rejects cross-site browser requests while keeping
 * non-browser (CLI/server/test) callers working.
 *
 * Run: node scripts/tests/csrf.test.ts
 */

import { run, finish, assertEqual } from "./suite.ts";
import { assertSameOrigin } from "../../lib/security/csrf.ts";

function req(headers: Record<string, string>): Request {
  return new Request("https://servis-sity-iwtr.vercel.app/api/test", { headers });
}

await run("SEC-3: same-origin Origin accepted", () => {
  assertEqual(
    assertSameOrigin(req({ origin: "https://servis-sity-iwtr.vercel.app", host: "servis-sity-iwtr.vercel.app" })),
    true,
  );
});

await run("SEC-3: evil Origin rejected", () => {
  assertEqual(
    assertSameOrigin(req({ origin: "https://evil.example", host: "servis-sity-iwtr.vercel.app" })),
    false,
  );
});

await run("SEC-3: Origin with different port/scheme rejected", () => {
  assertEqual(
    assertSameOrigin(req({ origin: "http://servis-sity-iwtr.vercel.app:3000", host: "servis-sity-iwtr.vercel.app" })),
    false,
  );
  assertEqual(
    assertSameOrigin(req({ origin: "https://servis-sity-iwtr.vercel.app.evil.co", host: "servis-sity-iwtr.vercel.app" })),
    false,
  );
});

await run("SEC-3: no Origin but cross-site sec-fetch-site rejected", () => {
  assertEqual(assertSameOrigin(req({ "sec-fetch-site": "cross-site" })), false);
});

await run("SEC-3: no Origin but same-origin sec-fetch accepted", () => {
  assertEqual(assertSameOrigin(req({ "sec-fetch-site": "same-origin" })), true);
});

await run("SEC-3: neither Origin nor sec-fetch-site (non-browser) accepted", () => {
  assertEqual(assertSameOrigin(req({})), true);
});

await run("SEC-3: Origin present but Host missing rejects", () => {
  assertEqual(assertSameOrigin(req({ origin: "https://servis-sity-iwtr.vercel.app" })), false);
});

await run("SEC-3: malformed Origin URL rejects", () => {
  assertEqual(assertSameOrigin(req({ origin: "not-a-url", host: "servis-sity-iwtr.vercel.app" })), false);
});

await finish();