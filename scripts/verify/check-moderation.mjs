import { createClient } from "@supabase/supabase-js";

const url = "https://rmydvjscqyagsiqhzeim.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJteWR2anNjcXlhZ3NpcWh6ZWltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjA1MTk5NSwiZXhwIjoyMTAxNjI3OTk1fQ.oID8S9j8pvXseS-FuDILfW5UadkJJWNqGDVdsZwBdy4";

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

async function probe(table, sampleId) {
  // Try to set status to 'pending' (only valid if migration 0040 applied)
  const { error: ePend } = await sb.from(table).update({ status: "pending" }).eq("id", sampleId);
  // Revert to original to avoid side effects
  const { error: eRevert } = await sb.from(table).update({ status: "archived" }).eq("id", sampleId);
  return { pendingUpdateError: ePend?.message ?? null, revertError: eRevert?.message ?? null };
}

const { data: products } = await sb.from("products").select("id, status").limit(1);
const { data: services } = await sb.from("services").select("id, status").limit(1);

console.log("PRODUCTS sample:", products);
console.log("SERVICES sample:", services);

if (products?.[0]) {
  console.log("PRODUCT probe:", await probe("products", products[0].id));
}
if (services?.[0]) {
  console.log("SERVICE probe:", await probe("services", services[0].id));
}
