/**
 * SEC-2 — Trusted client-IP extraction regression tests.
 * Verifies getClientIp can't be spoofed through the LEFT of X-Forwarded-For:
 * the rightmost (proxy-appended) entry wins, and Vercel's socket-IP header
 * takes precedence when present.
 *
 * Run: node scripts/tests/ip.test.ts
 */

import { run, finish, assertEqual } from "./suite.ts";
import { getClientIp } from "../../lib/security/ip.ts";

function req(headers: Record<string, string>): Request {
  return new Request("https://example.test/api/test", { headers });
}

await run("SEC-2: left-spoofed XFF ignored, rightmost peer wins", () => {
  assertEqual(
    getClientIp(req({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" })),
    "203.0.113.9",
  );
});

await run("SEC-2: single XFF value returned", () => {
  assertEqual(getClientIp(req({ "x-forwarded-for": "203.0.113.9" })), "203.0.113.9");
});

await run("SEC-2: x-vercel-forwarded-for (socket IP) wins over spoofed XFF", () => {
  assertEqual(
    getClientIp(
      req({
        "x-forwarded-for": "1.2.3.4, 198.51.100.7",
        "x-vercel-forwarded-for": "203.0.113.42",
      }),
    ),
    "203.0.113.42",
  );
});

await run("SEC-2: junk tokens in XFF fall back to the real peer IP", () => {
  assertEqual(
    getClientIp(req({ "x-forwarded-for": "not-an-ip, ,evil", "x-real-ip": "203.0.113.8" })),
    "203.0.113.8",
  );
});

await run("SEC-2: unparseable input -> unknown", () => {
  assertEqual(getClientIp(req({ "x-forwarded-for": "not-an-ip" })), "unknown");
  assertEqual(getClientIp(req({})), "unknown");
  assertEqual(getClientIp(req({ "x-forwarded-for": "999.1.1.1" })), "unknown");
});

await run("SEC-2: IPv6 token from XFF accepted", () => {
  assertEqual(
    getClientIp(req({ "x-forwarded-for": "2001:0db8:85a3:0000:0000:8a2e:0370:7334" })),
    "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
  );
});

await finish();