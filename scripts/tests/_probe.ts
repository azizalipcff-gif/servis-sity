import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
function loadEnv() {
  const out: Record<string, string> = {};
  const raw = readFileSync(resolve(root, ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}
const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: prods } = await admin.from("products").select("id, status").limit(5);
const id = prods![0].id;
const upd = await admin.from("products").update({ status: "pending_review" }).eq("id", id).select("status");
console.log("update->pending_review:", upd.data?.[0]?.status, "err:", upd.error?.message);
await admin.from("products").update({ status: prods![0].status }).eq("id", id);
console.log("restored. DONE");
