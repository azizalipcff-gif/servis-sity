const url = "https://rmydvjscqyagsiqhzeim.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJteWR2anNjcXlhZ3NpcWh6ZWltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjA1MTk5NSwiZXhwIjoyMTAxNjI3OTk1fQ.oID8S9j8pvXseS-FuDILfW5UadkJJWNqGDVdsZwBdy4";

const statements = [
  `alter table services drop constraint if exists services_status_check;`,
  `alter table services add constraint services_status_check check (status in ('draft', 'published', 'archived', 'pending'));`,
  `alter table services alter column status set default 'pending';`,
  `alter table products drop constraint if exists products_status_check;`,
  `alter table products add constraint products_status_check check (status in ('draft', 'published', 'archived', 'pending'));`,
  `alter table products alter column status set default 'pending';`,
];

async function runSql(query) {
  // Try both known SQL endpoints.
  for (const path of [`${url}/sql`, `${url}/rest/v1/sql`]) {
    const res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({ query }),
    });
    const text = await res.text();
    if (res.ok) return { ok: true, path, text };
    if (res.status !== 404) return { ok: false, path, status: res.status, text };
  }
  return { ok: false, text: "all endpoints 404" };
}

for (const stmt of statements) {
  const r = await runSql(stmt);
  console.log(stmt, "=>", JSON.stringify(r).slice(0, 200));
}
