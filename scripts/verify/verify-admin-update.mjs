import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";

const url = "https://rmydvjscqyagsiqhzeim.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJteWR2anNjcXlhZ3NpcWh6ZWltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjA1MTk5NSwiZXhwIjoyMTAxNjI3OTk1fQ.oID8S9j8pvXseS-FuDILfW5UadkJJWNqGDVdsZwBdy4";
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

function runLinkedSql(file) {
  return execSync(`supabase db query --linked -f ${file}`, { encoding: "utf8" });
}

async function verify(table, idCol) {
  const { data: admin } = await sb.from("profiles").select("id").eq("role", "admin").limit(1);
  const { data: biz } = await sb.from("businesses").select("id").limit(1);
  if (!admin?.[0] || !biz?.[0]) throw new Error("missing admin or business");
  const adminId = admin[0].id;
  const businessId = biz[0].id;

  // Create a test row in 'pending' (bypassing RLS via service role)
  const insertObj = { business_id: businessId, name: `MODERATION_TEST_${Date.now()}`, status: "pending" };
  if (table === "products") {
    insertObj.slug = `mod-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
  const { data: created, error: cErr } = await sb
    .from(table)
    .insert(insertObj)
    .select(idCol)
    .single();
  if (cErr || !created) throw new Error("create failed: " + JSON.stringify(cErr));
  const rowId = created[idCol];
  console.log(`[${table}] created test row ${rowId} as pending`);

  const sql = `
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"${adminId}","role":"authenticated"}', false);
update ${table} set status='published' where ${idCol}='${rowId}';
select 'after_approve' as step, status from ${table} where ${idCol}='${rowId}';
update ${table} set status='archived' where ${idCol}='${rowId}';
select 'after_reject' as step, status from ${table} where ${idCol}='${rowId}';
`;
  const file = `scripts/verify/_tmp_${table}.sql`;
  writeFileSync(file, sql);
  try {
    const out = runLinkedSql(file);
    console.log(`[${table}] RLS simulation output:\n${out}`);
  } finally {
    unlinkSync(file);
  }

  // Cleanup
  await sb.from(table).delete().eq(idCol, rowId);
  console.log(`[${table}] cleaned up test row`);
}

await verify("products", "id");
await verify("services", "id");
console.log("DONE");
