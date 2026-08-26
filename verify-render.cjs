const http = require("http");
function get(p) {
  return new Promise((res, rej) => {
    http.get({ host: "localhost", port: 3100, path: p }, (r) => {
      let b = ""; r.on("data", (c) => (b += c)); r.on("end", () => res({ s: r.statusCode, b }));
    }).on("error", rej);
  });
}
function has(re, s) { return re.test(s); }
(async () => {
  const results = [];
  const home = await get("/en");
  const fr = await get("/fr");
  const ar = await get("/ar");
  const business = await get("/en/business");
  const services = await get("/en/services");
  const products = await get("/en/products");
  const sm = await get("/sitemap.xml");
  const cats = [...sm.b.matchAll(/<loc>([^<]*?\/category\/[^<]*)<\/loc>/g)].map((m) => m[1]);
  const bizs = [...sm.b.matchAll(/<loc>([^<]*?\/businesses\/[^<]*)<\/loc>/g)].map((m) => m[1]);
  console.log("sitemap category URLs:", cats.length, "| business URLs:", bizs.length);
  const catPath = cats[0] ? new URL(cats[0]).pathname : null;
  const bizPath = bizs[0] ? new URL(bizs[0]).pathname : null;
  const category = catPath ? await get(catPath) : null;
  const detail = bizPath ? await get(bizPath) : null;

  const check = (n, c) => results.push([n, !!c]);
  const altRe = (code) => new RegExp(`hrefLang="${code}"`);

  check("home: Organization JSON-LD", has(/application\/ld\+json[^>]*>[\s\S]*?"Organization"/, home.b));
  check("home: WebSite JSON-LD", has(/"WebSite"/, home.b));
  check("home: SearchAction JSON-LD", has(/"SearchAction"/, home.b) || has(/"SearchAction"/, home.b));
  check("home: hreflang en-US", has(altRe("en-US"), home.b));
  check("home: hreflang fr-FR", has(altRe("fr-FR"), home.b));
  check("home: hreflang ar-MA", has(altRe("ar-MA"), home.b));
  check("home: hreflang x-default", has(altRe("x-default"), home.b));
  check("home: canonical = prod /en", has(/<link rel="canonical"[^>]*href="https:\/\/servis-sity-iwtr\.vercel\.app\/en"/, home.b));
  check("fr: hreflang en-US", has(altRe("en-US"), fr.b));
  check("ar: hreflang ar-MA", has(altRe("ar-MA"), ar.b));
  check("business listing: ItemList", has(/"ItemList"/, business.b));
  check("business listing: BreadcrumbList", has(/"BreadcrumbList"/, business.b));
  check("services listing: ItemList", has(/"ItemList"/, services.b));
  check("products listing: ItemList", has(/"ItemList"/, products.b));
  if (category) {
    check("category: ItemList", has(/"ItemList"/, category.b));
    check("category: BreadcrumbList", has(/"BreadcrumbList"/, category.b));
  } else check("category page fetched", false);
  if (detail) {
    check("business detail: LocalBusiness", has(/LocalBusiness/, detail.b));
    check("business detail: priority image", has(/fetchpriority/i, detail.b));
  } else { results.push(["business detail: SKIPPED (no local business data)", true]); }

  let pass = 0;
  for (const [n, ok] of results) { console.log(`${ok ? "PASS" : "FAIL"}  ${n}`); if (ok) pass++; }
  console.log(`\n${pass}/${results.length} checks passed`);
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
