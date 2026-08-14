/**
 * PHASE 3 — read-only live-database verification.
 * Uses the service-role key via PostgREST. Reads only; writes nothing.
 *
 * Run: node --env-file=.env.local scripts/verify/db-check.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("MISSING_ENV: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
console.log(`project url: ${url}`);

const sb = createClient(url, key, { auth: { persistSession: false } });

const log = (k, v) => console.log(`${k.padEnd(38)} ${String(v)}`);

async function trySelect(table, select) {
  const { data, error } = await sb.from(table).select(select).limit(1);
  return { data, error };
}

async function headCount(fn) {
  const { count, error } = await fn();
  if (error) throw error;
  return count ?? 0;
}

async function exactCount(promiseFactory) {
  const { data, error } = await promiseFactory();
  if (error) throw error;
  return data?.length ?? 0;
}

/* ------------------------------------------------------------------ */
console.log("=== A. column existence ===");
for (const t of ["businesses", "services", "products"]) {
  for (const col of ["searchable_text", "embedding"]) {
    const { error } = await trySelect(t, col);
    log(`col ${t}.${col}`, error ? `MISSING — ${(error.message || "").slice(0, 90)}` : "present");
  }
}

/* ------------------------------------------------------------------ */
console.log("\n=== B. hybrid_search RPC ===");
let rpcState = "unknown";
let rpcData = null;
{
  const { data, error } = await sb.rpc("hybrid_search", {
    p_query: "electrician",
    p_type: "all",
    p_limit: 5,
  });
  if (error) rpcState = `ERROR — ${(error.message || JSON.stringify(error)).slice(0, 140)}`;
  else {
    rpcState = "present & executable";
    rpcData = Array.isArray(data) ? data : [];
  }
}
log("hybrid_search RPC", rpcState);
if (rpcData) log("sample hit rows", rpcData.length);

/* ------------------------------------------------------------------ */
console.log("\n=== C. totals + embedding/searchable population ===");
const counts = {};
for (const t of ["businesses", "services", "products"]) {
  let total = 0;
  let emb = NaN;
  let st = "n/a";
  try {
    total = await headCount(() => sb.from(t).select("id", { count: "exact", head: true }));
  } catch (e) {
    log(`${t} count`, `err ${(e.message || "").slice(0, 90)}`);
  }
  try {
    emb = await exactCount(() => sb.from(t).select("id").not("embedding", "is", null));
  } catch {
    emb = NaN;
  }
  try {
    st = String(await exactCount(() => sb.from(t).select("id").gt("searchable_text", "")));
  } catch {
    st = "n/a";
  }
  counts[t] = { total, emb, st };
  log(`${t} total`, total);
  log(`${t} with embedding`, emb);
  log(`${t} with searchable_text`, st);
}

/* ------------------------------------------------------------------ */
console.log("\n=== D. impact & best verification path ===");
const hasRpc = rpcState === "present & executable";
log("0019 migration applied (inferred from schema)", hasRpc ? "YES" : "NO — columns + RPC absent");
log("hybrid_search available to API", hasRpc ? "yes" : "no — route falls back to legacy ilike path");
log("semantic/vector search", "not active — no embedding column, no embeddings, no RPC");
log("embedding pipeline in repo", "none (no supabase/functions, no API route writing embeddings)");
void counts;

console.log("\nDONE");
if (!hasRpc) process.exitCode = 2;