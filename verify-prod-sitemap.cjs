const https = require("https");
const assert = require("assert");

const CANON = "https://servis-sity-iwtr.vercel.app";
const EXPECTED = 117;

function rawGet(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "GET", headers }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () =>
        resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") }),
      );
    });
    req.on("error", reject);
    req.setTimeout(20000, () => req.destroy(new Error("timeout")));
    req.end();
  });
}

(async () => {
  const res = await rawGet(`${CANON}/sitemap.xml`, {
    "Accept-Encoding": "identity",
    "Cache-Control": "no-cache, max-age=0",
    Pragma: "no-cache",
    "User-Agent": "sitemap-verifier",
  });
  assert.strictEqual(res.status, 200, `status must be 200, got ${res.status}`);
  assert.strictEqual(res.headers["x-vercel-cache"], "MISS", `expected fresh origin (MISS), got ${res.headers["x-vercel-cache"]}`);

  const body = res.body;
  const open = (body.match(/<url(\s[^>]*)?>/g) || []).length;
  const close = (body.match(/<\/url>/g) || []).length;
  const locOpen = (body.match(/<loc>/g) || []).length;
  const locClose = (body.match(/<\/loc>/g) || []).length;
  const blocks = [...body.matchAll(/<url(\s[^>]*)?>([\s\S]*?)<\/url>/g)];

  assert.strictEqual(open, close, `unbalanced <url> tags: open=${open} close=${close}`);
  assert.strictEqual(locOpen, locClose, `unbalanced <loc> tags: ${locOpen}/${locClose}`);
  assert.strictEqual(open, locOpen, `every <url> must contain exactly one <loc>: url=${open} loc=${locOpen}`);
  assert.strictEqual(blocks.length, EXPECTED, `expected ${EXPECTED} urls, got ${blocks.length}`);

  const privateTokens = ["/dashboard", "/login", "/register", "/forgot-password", "/update-password", "/profile", "/messenger", "/checkout", "/auth/", "/api/", "mvkbazizalimvkbadmen"];
  const seen = new Set();
  let emptyUrl = 0, emptyLoc = 0, badOrigin = 0, query = 0, dup = 0, priv = 0;

  for (const m of blocks) {
    const inner = m[2];
    if (inner.trim() === "") emptyUrl++;
    const loc = (inner.match(/<loc>([\s\S]*?)<\/loc>/) || [])[1] || "";
    if (loc.trim() === "") emptyLoc++;
    if (!loc.startsWith(CANON)) badOrigin++;
    if (loc.includes("?") || loc.includes("#")) query++;
    if (seen.has(loc)) dup++;
    else seen.add(loc);
    for (const t of privateTokens) if (loc.includes(t)) priv++;
  }

  assert.strictEqual(emptyUrl, 0, `empty <url> blocks: ${emptyUrl}`);
  assert.strictEqual(emptyLoc, 0, `empty <loc> blocks: ${emptyLoc}`);
  assert.strictEqual(badOrigin, 0, `non-canonical origin urls: ${badOrigin}`);
  assert.strictEqual(query, 0, `query/hash urls: ${query}`);
  assert.strictEqual(dup, 0, `duplicate urls: ${dup}`);
  assert.strictEqual(priv, 0, `private/admin urls present: ${priv}`);

  console.log("PROD SITEMAP VERIFICATION: PASS");
  console.log(`  total urls: ${blocks.length}`);
  console.log(`  unique urls: ${seen.size}`);
  console.log(`  x-vercel-cache: ${res.headers["x-vercel-cache"]}`);
})().catch((e) => {
  console.error("PROD SITEMAP VERIFICATION: FAIL");
  console.error("  " + e.message);
  process.exit(1);
});
