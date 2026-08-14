/**
 * PHASE 1 — one-shot embedding backfill (write path) via local Ollama.
 *
 * Reads ONLY real catalog rows that have no embedding, builds the deterministic
 * searchable representation, generates 1536-dim vectors with the local Ollama
 * provider, and writes them back through PostgREST. Idempotent: rows already
 * embedded are skipped, so it is safe to re-run after partial failures.
 *
 * Writes ONLY the `embedding` column of businesses/services/products. No fake
 * rows are created, no destructive operation runs. No OpenAI dependency.
 *
 * Guards (exit codes):
 *   2  — migration 0019 not applied (embedding columns missing)
 *   3  — Ollama provider unavailable / model missing / dimension mismatch
 *
 * `--dry-run`: skip the provider entirely; fetch real rows and print the exact
 * embedding texts that WOULD be sent (id + deterministic public text). Verifies
 * the relationship fix end-to-end with zero provider calls.
 *
 * Run: node --env-file=.env.local scripts/verify/backfill-embeddings.mjs
 */

import { createClient } from "@supabase/supabase-js";
import {
  buildEmbeddingText,
  generateEmbeddings,
  isEmbeddingConfigured,
  OllamaUnavailableError,
  OllamaModelNotFoundError,
  EmbeddingDimensionError,
  OllamaResponseFormatError,
} from "../../lib/search-quality/embeddings.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!url || !key) {
    console.error("MISSING_ENV: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    process.exitCode = 1;
    return;
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const log = (m) => console.log(m);
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) log("[dry-run] provider skipped — printing would-be texts only");

  /* ---- schema guard: embedding columns must exist (0019 applied) ---- */
  const colRes = await sb.from("businesses").select("embedding").limit(1);
  if (colRes.error && /does not exist/i.test(colRes.error.message || "")) {
    console.error(
      "GUARD: migration 0019 not applied — embedding columns missing. " +
        "Apply supabase/migrations/0019_search_quality.sql first.",
    );
    process.exitCode = 2;
    return;
  }

  /* ---- provider guard ---- */
  if (!isEmbeddingConfigured() && !dryRun) {
    console.error(
      "GUARD: no OLLAMA_EMBEDDING_MODEL — cannot generate real embeddings. " +
        "Set OLLAMA_EMBEDDING_MODEL (+ optional OLLAMA_BASE_URL, default " +
        "http://127.0.0.1:11434) then re-run.",
    );
    process.exitCode = 3;
    return;
  }

  const KINDS = [
    {
      kind: "business",
      table: "businesses",
      // No nested `categories(...)` embed: businesses↔categories has multiple
      // FK relationships, which PostgREST rejects ("more than one relationship
      // was found"). The category display name is resolved explicitly by
      // category_id below (enrich), keeping the public-only contract intact.
      select: "id, name, description, city, category_id",
      toInput: (r) => ({
        kind: "business",
        name: r.name,
        description: r.description,
        category: null,
        categoryName: r._categoryName,
        city: r.city,
      }),
      async enrich(rows, client) {
        const ids = Array.from(
          new Set(rows.map((r) => r.category_id).filter(Boolean)),
        );
        const map = new Map();
        if (ids.length > 0) {
          const { data, error } = await client
            .from("categories")
            .select("id, name_en, name_fr, name_ar")
            .in("id", ids);
          if (error) {
            log(`[business] category lookup skip: ${error.message}`);
          } else {
            for (const c of data ?? []) map.set(String(c.id), c);
          }
        }
        return rows.map((r) => {
          const c = map.get(String(r.category_id));
          return {
            ...r,
            _categoryName: c ? (c.name_en ?? c.name_fr ?? c.name_ar) : null,
          };
        });
      },
    },
    {
      kind: "service",
      table: "services",
      select:
        "id, name, description, price, status, business_id, business:businesses(name, city)",
      toInput: (r) => ({
        kind: "service",
        name: r.name,
        description: r.description,
        category: null,
        categoryName: null,
        city: r.business?.city ?? null,
        business: r.business
          ? { name: r.business.name, city: r.business.city }
          : null,
        price: r.price,
      }),
    },
    {
      kind: "product",
      table: "products",
      select:
        "id, name, description, price, status, business_id, business:businesses(name, city)",
      toInput: (r) => ({
        kind: "product",
        name: r.name,
        description: r.description,
        category: null,
        categoryName: null,
        city: r.business?.city ?? null,
        business: r.business
          ? { name: r.business.name, city: r.business.city }
          : null,
        price: r.price,
      }),
    },
  ];

  let embedded = 0;
  let failed = 0;

  for (const c of KINDS) {
    let from = 0;
    const chunk = 50;
    for (;;) {
      const { data, error } = await sb
        .from(c.table)
        .select(c.select)
        .is("embedding", null)
        .range(from, from + chunk - 1);
      if (error) {
        log(`[${c.kind}] skip: ${error.message}`);
        break;
      }
      if (!data || data.length === 0) break;

      const rows = c.enrich ? await c.enrich(data, sb) : data;
      const texts = rows.map((r) => buildEmbeddingText(c.toInput(r)));

      if (dryRun) {
        for (let i = 0; i < rows.length; i += 1) {
          log(`[${c.kind}] DRY id=${rows[i].id} text=${texts[i]}`);
        }
        from += chunk;
        continue;
      }

      try {
        const vectors = await generateEmbeddings(texts);
        for (let i = 0; i < rows.length; i += 1) {
          const row = rows[i];
          const literal = `[${vectors[i].join(",")}]`;
          const up = await sb
            .from(c.table)
            .update({ embedding: literal })
            .eq("id", row.id);
          if (up.error) {
            failed += 1;
            log(`[${c.kind}] ${row.id} update failed: ${up.error.message}`);
          } else {
            embedded += 1;
          }
        }
      } catch (e) {
        // Provider-level failure (Ollama down, model missing, dim mismatch) —
        // a hard environment blocker: report explicitly and stop with exit 3.
        // Transient row failures (write errors) keep exit 1.
        const msg = e instanceof Error ? e.message : String(e);
        log(`[${c.kind}] batch failed, pausing: ${msg}`);
        if (
          e instanceof OllamaUnavailableError ||
          e instanceof OllamaModelNotFoundError ||
          e instanceof EmbeddingDimensionError ||
          e instanceof OllamaResponseFormatError
        ) {
          process.exitCode = 3;
          failed += data.length;
        } else {
          failed += data.length;
        }
        break;
      }
      from += chunk;
    }
    if (failed > 0) break;
  }

  log(`DONE embeds=${embedded} failed=${failed} (real rows only)`);
  if (failed > 0 && process.exitCode == null) process.exitCode = 1;
}

await main();