const http = require("http");
function get(p) {
  return new Promise((res, rej) => {
    http.get({ host: "localhost", port: 3100, path: p }, (r) => {
      let b = ""; r.on("data", (c) => (b += c)); r.on("end", () => res({ s: r.statusCode, b }));
    }).on("error", rej);
  });
}
(async () => {
  const home = await get("/en");
  const m = home.b.match(/<link[^>]*alternate[^>]*>/g) || [];
  console.log("HOME status", home.s, "alternate links", m.length);
  m.slice(0, 6).forEach((x) => console.log("  ", x));
  const sm = await get("/sitemap.xml");
  const biz = [...sm.b.matchAll(/<loc>([^<]*?\/businesses\/[^<]*)<\/loc>/g)].map((x) => x[1]);
  console.log("first business loc", biz[0]);
  const bp = new URL(biz[0]).pathname;
  const det = await get(bp);
  console.log("DETAIL status", det.s, "len", det.b.length);
  console.log("has LocalBusiness", /LocalBusiness/.test(det.b));
  console.log("has fetchpriority", /fetchpriority/i.test(det.b));
  const i = det.b.indexOf("fetchpriority");
  console.log("fetchpriority idx", i, i >= 0 ? det.b.slice(i - 60, i + 20) : "");
})().catch((e) => console.log("ERR", e.message));
