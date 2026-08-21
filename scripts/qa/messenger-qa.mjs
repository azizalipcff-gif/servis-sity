/* Messenger QA harness — two live sessions exchanging messages.
 * Creates throwaway users + conversation via the service-role key,
 * then drives two Playwright contexts against the dev server.
 * Run: node messenger-qa.mjs   (from the qa dir)
 */
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync("C:/Users/Admin/Desktop/set web ali/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const BASE = "http://localhost:3000";
const results = [];
function check(name, ok, extra = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? ` — ${extra}` : ""}`);
}

// --- seed -----------------------------------------------------------------
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stamp = Date.now();
const A = { email: `qa-a-${stamp}@test.local`, password: "Qa-Passw0rd!", name: "QA Alice" };
const B = { email: `qa-b-${stamp}@test.local`, password: "Qa-Passw0rd!", name: "QA Bob" };

async function createUser(u) {
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { full_name: u.name },
  });
  if (error) throw error;
  // Admin-created users bypass the handle_new_user trigger, so create the
  // profile row explicitly (real signups get one from the trigger).
  const { error: pErr } = await admin
    .from("profiles")
    .upsert({ id: data.user.id, full_name: u.name });
  if (pErr) throw pErr;
  return data.user.id;
}

const aId = await createUser(A);
const bId = await createUser(B);
console.log(`users: A=${aId} B=${bId}`);

const convId = crypto.randomUUID();
{
  const ins = async (table, rows) => {
    const { error } = await admin.from(table).insert(rows);
    if (error) throw new Error(`seed ${table}: ${error.message}`);
  };
  await ins("conversations", [{ id: convId, type: "private", created_by: aId }]);
  await ins("conversation_members", [
    { conversation_id: convId, user_id: aId },
    { conversation_id: convId, user_id: bId },
  ]);
  await ins("messages", [
    { conversation_id: convId, sender_id: bId, type: "text", body: "Seed message from Bob" },
  ]);
  console.log(`conversation seeded: ${convId}`);
}

// --- browser --------------------------------------------------------------
const browser = await chromium.launch();
const ctxA = await browser.newContext({ locale: "en" });
const ctxB = await browser.newContext({ locale: "en" });
const pageA = await ctxA.newPage();
const pageB = await ctxB.newPage();

for (const [tag, pg] of [["A", pageA], ["B", pageB]]) {
  pg.on("console", (m) => {
    if (m.type() === "error") console.log(`[console-${tag}]`, m.text().slice(0, 220));
  });
  pg.on("pageerror", (e) => console.log(`[pageerror-${tag}]`, String(e).slice(0, 300)));
  pg.on("response", (r) => {
    const u = r.url();
    if (u.includes("/api/messenger/")) {
      console.log(`[api-${tag}]`, r.status(), r.request().method(), u.replace(BASE, ""));
    }
  });
  if (tag === "A") {
    pg.on("websocket", (ws) => {
      if (!ws.url().includes("/realtime/")) return;
      console.log("[ws] opened:", ws.url().slice(0, 80));
      ws.on("framereceived", (f) => {
        const s = f.payload?.toString?.() ?? "";
        if (!s.includes("postgres_changes") && !s.includes("subscription") && !s.includes("error")) return;
        try {
          const m = JSON.parse(s);
          const ev = m.event ?? "";
          if (ev === "heartbeat" || ev === "phx_reply" && m.payload?.status === "ok" && !m.payload?.response) return;
          console.log("[ws<-]", s.slice(0, 400));
        } catch {}
      });
      ws.on("framesent", (f) => {
        const s = f.payload?.toString?.() ?? "";
        if (!s.includes("postgres_changes")) return;
        console.log("[ws->]", s.slice(0, 300));
      });
    });
  }
}

async function login(page, u) {
  await page.goto(`${BASE}/en/login`);
  await page.locator("#email").fill(u.email);
  await page.locator("#password").fill(u.password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL((u2) => !u2.pathname.includes("/login"), { timeout: 20000 });
}

async function dumpState(pg, tag) {
  console.log(`[diag-${tag}] url:`, pg.url());
  const body = await pg.locator("body").innerText().catch(() => "<no body>");
  console.log(`[diag-${tag}] body:`, body.slice(0, 500).replace(/\n/g, " | "));
  const api = await pg.evaluate(async () => {
    const r = await fetch("/api/messenger/conversations", { cache: "no-store" });
    return [r.status, (await r.text()).slice(0, 400)];
  });
  console.log(`[diag-${tag}] conversations API:`, api);
}

try {
  await login(pageA, A);
  await login(pageB, B);
  check("auth: both users logged in", true);

  await Promise.all([pageA.goto(`${BASE}/en/messenger`), pageB.goto(`${BASE}/en/messenger`)]);
  try {
    await pageA.waitForSelector("text=Seed message from Bob", { timeout: 15000 });
    check("list: A sees conversation with last message preview", true);
  } catch (e) {
    await dumpState(pageA, "A");
    throw e;
  }

  console.log("[diag] aside:", JSON.stringify((await pageA.locator("aside").innerText().catch(() => "none")).slice(0, 300)));
  const api2 = await pageA.evaluate(async () => {
    const r = await fetch("/api/messenger/conversations", { cache: "no-store" });
    return (await r.text()).slice(0, 900);
  });
  console.log("[diag] api:", api2);

  const badge = await pageA.locator("span.bg-destructive").first().textContent().catch(() => null);
  check("list: unread badge visible for A", Boolean(badge), `badge=${badge}`);

  await pageA.getByRole("button").filter({ hasText: "QA Bob" }).first().click();
  try {
    await pageA.waitForSelector("text=Seed message from Bob", { timeout: 10000 });
    check("thread: A opens thread and sees history", true);
  } catch (e) {
    await dumpState(pageA, "A-thread");
    throw e;
  }

  await pageB.getByRole("button").filter({ hasText: "QA Alice" }).first().click();
  await pageB.waitForSelector("text=Seed message from Bob", { timeout: 10000 });

  await pageB.getByLabel(/type a message/i).fill("typing test");
  const typingVisible = await pageA
    .waitForSelector("text=typing...", { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  check("realtime: typing indicator reaches peer", typingVisible);

  await pageB.getByLabel(/type a message/i).fill("Hello from Bob!");
  await pageB.keyboard.press("Enter");
  try {
    await pageA.waitForSelector("text=Hello from Bob!", { timeout: 10000 });
    check("realtime: B's message lands in A's open thread", true);
  } catch (e) {
    await dumpState(pageA, "A-receive");
    throw e;
  }

  const seenIcon = await pageB
    .locator("svg.text-sky-500")
    .first()
    .waitFor({ timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  if (!seenIcon) {
    const bubbles = await pageB.locator("[data-mine], .justify-end").allInnerTexts().catch(() => []);
    console.log("[diag-B] my bubbles:", JSON.stringify(bubbles).slice(0, 400));
    const marks = await pageB.evaluate(async () => {
      const r = await fetch("/api/messenger/conversations", { cache: "no-store" });
      const j = await r.json();
      return JSON.stringify(j.conversations?.[0]?.participants ?? []).slice(0, 400);
    });
    console.log("[diag-B] participants:", marks);
  }
  check("receipts: B sees blue double-check after A reads", seenIcon);

  await pageA.getByLabel(/type a message/i).fill("Hey Bob, reply!");
  await pageA.keyboard.press("Enter");
  await pageB.waitForSelector("text=Hey Bob, reply!", { timeout: 10000 });
  check("realtime: A's reply lands in B's thread", true);

  // Failed send -> failed state + retry.
  await pageA.route("**/api/messenger/messages", async (route) => {
    if (route.request().method() === "POST") return route.abort();
    return route.continue();
  });
  await pageA.getByLabel(/type a message/i).fill("this will fail");
  await pageA.keyboard.press("Enter");
  const failedShown = await pageA
    .waitForSelector("text=Failed", { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  check("resilience: aborted send shows failed state", failedShown);

  await pageA.unroute("**/api/messenger/messages");
  await pageA.getByRole("button", { name: /retry/i }).first().click();
  const retried = await pageB
    .waitForSelector("text=this will fail", { timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  check("resilience: retry delivers the message", retried);

  // Link safety: no javascript: anchor may appear.
  await pageB.getByLabel(/type a message/i).fill("x javascript:alert(1) end");
  await pageB.keyboard.press("Enter");
  await pageA.waitForSelector("text=x javascript:alert(1) end", { timeout: 10000 });
  const jsAnchorCount = await pageA.locator('a[href^="javascript:"]').count();
  check("security: no javascript: anchor rendered in bubbles", jsAnchorCount === 0, `count=${jsAnchorCount}`);
} catch (err) {
  check("harness completed without exception", false, String(err).slice(0, 300));
} finally {
  try { await admin.auth.admin.deleteUser(aId); } catch {}
  try { await admin.auth.admin.deleteUser(bId); } catch {}
  try { await admin.from("messages").delete().eq("conversation_id", convId); } catch {}
  try { await admin.from("conversation_members").delete().eq("conversation_id", convId); } catch {}
  try { await admin.from("conversations").delete().eq("id", convId); } catch {}

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n# ${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

