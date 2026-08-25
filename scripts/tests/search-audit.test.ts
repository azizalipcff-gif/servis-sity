/**
 * Search production-audit regression tests — runnable with plain `node`
 * (Node 22.10+/24 with type stripping). No DB and no bundler-style imports.
 *
 * Coverage:
 *   - private-field stripping (Part 4 / 12)            — runtime
 *   - typo-tolerance RPC fix present (Part 7)          — source guard
 *   - unified default type=all (Part 2)                — source guard
 *   - city inference + EN aliases (Part 5 / 6)         — source guard
 *   - relevance dominates trust in ranking (Part 8)    — source guard
 *
 * Behavioral tests for parseSearchParams / inferCityFromQuery / rankSearchItems
 * live in modules that use bundler-style imports (`@/...`, extensionless) and
 * are exercised by the app's own test runner; this file guards the invariants
 * that the audit changed so they cannot silently regress.
 *
 * Run: node scripts/tests/search-audit.test.ts
 */

import { run, finish, assert, assertEqual } from "./suite.ts";
import { stripPrivateBusiness } from "../../lib/search/sanitize.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readSource(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

run("private business fields are stripped at runtime", () => {
  const row = {
    id: "b1",
    name: "Acme",
    owner_id: "profile-uuid",
    status_note: "internal reviewer note",
    embedding: "[0.1,0.2]",
    searchable_text: "acme plombier",
    ean: "12345",
    city: "Oujda",
    rating_avg: 4,
  };
  const clean = stripPrivateBusiness(row as unknown as Record<string, unknown>);
  assert(!("owner_id" in clean), "owner_id must be removed");
  assert(!("status_note" in clean), "status_note must be removed");
  assert(!("embedding" in clean), "embedding must be removed");
  assert(!("searchable_text" in clean), "searchable_text must be removed");
  assert(!("ean" in clean), "ean must be removed");
  assertEqual((clean as { name: string }).name, "Acme");
  assertEqual((clean as { city: string }).city, "Oujda");
});

run("unified search defaults to type=all", () => {
  const src = readSource("lib/search/url.ts");
  assert(/type:\s*"all"/.test(src), "parseSearchParams must default type to 'all'");
  assert(
    /SEARCH_TYPES[\s\S]*?\? \(use\.type as SearchResultType\)\s*:\s*"all"/.test(src) ||
      /:\s*"all";/.test(src),
    "invalid type must fall back to 'all'",
  );
});

run("city inference + explicit-city precedence present", () => {
  const route = readSource("app/api/search/route.ts");
  assert(
    /requestedCity = raw\.city \|\| infer\.city/.test(route),
    "explicit city param must win over inferred city",
  );
  const nl = readSource("lib/search/nl-parser.ts");
  assert(/oujda/i.test(nl), "Oujda must be a known city alias");
  assert(/وجدة/.test(nl), "Arabic city alias (وجدة) must be present");
});

run("multilingual (English) category synonym present", () => {
  const nl = readSource("lib/search/nl-parser.ts");
  assert(/"plumber"/.test(nl), "English 'plumber' must map to plombier");
  assert(/"plombier"/.test(nl), "French 'plombier' must map to plombier");
});

run("ranking: query relevance dominates trust", () => {
  const ranking = readSource("lib/search/ranking.ts");
  assert(
    /scoreQuery\(query, itemSearchText\(item\)\)\.score/.test(ranking),
    "rankSearchItems must sort by query-relevance score first",
  );
  assert(
    /itemRelevance\(b\) - itemRelevance\(a\)/.test(ranking) ||
      /relevanceScore\(b\) - relevanceScore\(a\)/.test(ranking),
    "trust must only break ties after relevance",
  );
});

run("typo-tolerance RPC fix is deployed in migration", () => {
  const sql = readSource("supabase/migrations/0020_hybrid_search_typo_tolerance.sql");
  assert(
    /similarity\(\s*\w+\.searchable_text\s*,\s*qn\s*\)\s*>\s*0\.3/.test(sql),
    "hybrid_search must score fuzzy similarity() matches",
  );
  assert(
    sql.includes("create or replace function public.hybrid_search"),
    "hybrid_search function must be replaced",
  );
});

finish();
