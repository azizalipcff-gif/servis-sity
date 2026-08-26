const fs = require("fs");
const xml = fs.readFileSync("sm.xml", "utf8");
const blocks = xml.split(/<url>/).slice(1).map((b) => "<url>" + b.split("</url>")[0] + "</url>");
console.log("total <url> blocks:", blocks.length);

const empties = [];
blocks.forEach((b, i) => {
  const loc = (b.match(/<loc>(.*?)<\/loc>/) || [])[1];
  if (!loc || loc.trim() === "") empties.push(i);
});
console.log("empty <url> indices:", empties);

empties.forEach((i) => {
  console.log(`\n--- empty block at index ${i} ---`);
  console.log(blocks[i]);
  // show neighbors
  const from = Math.max(0, i - 2);
  const to = Math.min(blocks.length - 1, i + 2);
  for (let j = from; j <= to; j++) {
    const loc = (blocks[j].match(/<loc>(.*?)<\/loc>/) || [])[1] || "(NO LOC)";
    console.log(`  [${j}] ${loc}`);
  }
});

// Also collect any loc that looks malformed
const bad = [];
blocks.forEach((b, i) => {
  const loc = (b.match(/<loc>(.*?)<\/loc>/) || [])[1];
  if (loc) {
    if (loc.includes("undefined") || loc.includes("null") || loc.includes("//") || /\?/.test(loc) || !loc.startsWith("https://servis-sity-iwtr.vercel.app/")) {
      bad.push({ i, loc });
    }
  }
});
console.log("\nmalformed/non-canonical locs:", bad.length);
bad.slice(0, 20).forEach((x) => console.log(`  [${x.i}] ${x.loc}`));
