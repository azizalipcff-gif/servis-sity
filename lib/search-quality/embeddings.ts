/**
 * Server-side embedding pipeline for the search-quality stack.
 *
 * • Provider: Ollama running locally (default http://127.0.0.1:11434). Reads
 *   `OLLAMA_BASE_URL` and `OLLAMA_EMBEDDING_MODEL` — NEVER `NEXT_PUBLIC_*`
 *   variants, and this module must never be imported from client components.
 * • Dimension invariant: the 0019 migration declares `vector(1536)`, so every
 *   vector produced here MUST be exactly 1536. The Ollama request passes
 *   `dimensions: 1536` (the model-sanctioned Matryoshka/MRL output width for
 *   models that support it, e.g. qwen3-embedding:4b). Any response that is not
 *   exactly 1536 throws `EmbeddingDimensionError` — vectors are never sliced,
 *   padded, interpolated or fabricated.
 * • Graceful degradation: `isEmbeddingConfigured()` gates callers; missing
 *   config or a failing server throw explicit, typed errors so search drops to
 *   its lexical/legacy path instead of 500ing.
 * • Deterministic: identical input rows produce identical embeddings (plus an
 *   in-process cache) — safe for backfill/upsert idempotence.
 */

import { canonicalTokens } from "./normalize.ts";

/** Required to match `vector(1536)` in migration 0019 — do not change in Phase 1. */
export const EMBEDDING_DIMENSION = 1536;
/** Max inputs per Ollama `/api/embed` request (local, memory-friendly batch). */
export const EMBEDDING_BATCH = 128;
/** Hard ceiling on a single embank call; a hung server fails loudly, not silently. */
export const EMBEDDING_TIMEOUT_MS = 60_000;
export const OLLAMA_DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const CACHE_CAP = 2000;

/* --------------------------------------------------------------------------
 * Error types — explicit, never swallowed silently.
 * -------------------------------------------------------------------------- */

export class OllamaNotConfiguredError extends Error {
  constructor() {
    super(
      "Ollama embedding provider not configured: OLLAMA_EMBEDDING_MODEL is missing",
    );
    this.name = "OllamaNotConfiguredError";
  }
}

export class OllamaUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OllamaUnavailableError";
  }
}

export class OllamaModelNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OllamaModelNotFoundError";
  }
}

export class OllamaResponseFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OllamaResponseFormatError";
  }
}

export class EmbeddingDimensionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmbeddingDimensionError";
  }
}

/* --------------------------------------------------------------------------
 * Configuration detection
 * -------------------------------------------------------------------------- */

/** Server-side base URL; defaults to the local Ollama endpoint. */
export function getOllamaBaseUrl(): string {
  return process.env.OLLAMA_BASE_URL?.trim() || OLLAMA_DEFAULT_BASE_URL;
}

/** Model name comes from env only — never hardcoded, never NEXT_PUBLIC_. */
export function getEmbeddingModel(): string {
  return process.env.OLLAMA_EMBEDDING_MODEL?.trim() || "";
}

/** True only when a server-side Ollama model is configured. */
export function isEmbeddingConfigured(): boolean {
  return Boolean(getEmbeddingModel());
}

/* --------------------------------------------------------------------------
 * Deterministic embedding text (contract unchanged — Phase 1 must not change)
 * -------------------------------------------------------------------------- */

/** Public display fields only — never private profile/user data. */
export interface EmbeddingInput {
  kind: "business" | "service" | "product";
  name?: string | null;
  description?: string | null;
  /** Category slug and/or display name (more semantic when present). */
  category?: string | null;
  categoryName?: string | null;
  city?: string | null;
  business?: { name?: string | null; city?: string | null } | null;
  price?: number | null;
}

/** Stable, normalized, de-duplicated search representation for embedding. */
export function buildEmbeddingText(input: EmbeddingInput): string {
  const fields: Array<string | null | undefined> = [
    input.name,
    input.description,
    input.categoryName ?? input.category,
    input.city,
  ];
  if (input.kind !== "business") {
    fields.push(input.business?.name, input.business?.city);
    if (input.price != null) {
      fields.push(String(Math.round(input.price)));
    }
  }
  return uniqueTokens(fields.join(" ")).join(" ");
}

function uniqueTokens(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const token of canonicalTokens(text)) {
    if (token.length === 0 || seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}

/* --------------------------------------------------------------------------
 * Provider abstraction
 * -------------------------------------------------------------------------- */

export interface EmbeddingProvider {
  readonly name: string;
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

/**
 * Ollama provider — the only provider wired in Phase 1.
 *
 * Talks to Ollama's native `/api/embed` and requests `dimensions: 1536`.
 * Every returned vector is verified to be exactly 1536 dimensions; any other
 * length (including empty) throws `EmbeddingDimensionError`.
 */
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly name = "ollama";

  generateEmbedding(text: string): Promise<number[]> {
    return this.embed([text]).then((v) => v[0]);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const batches = chunk(texts, EMBEDDING_BATCH);
    const groups = await Promise.all(batches.map((b) => this.embed(b)));
    const out: number[][] = [];
    for (const group of groups) out.push(...group);
    return out;
  }

  private async embed(inputs: string[]): Promise<number[][]> {
    const model = getEmbeddingModel();
    if (!model) throw new OllamaNotConfiguredError();
    const baseUrl = getOllamaBaseUrl();

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/api/embed`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          input: inputs,
          dimensions: EMBEDDING_DIMENSION,
        }),
        signal: AbortSignal.timeout(EMBEDDING_TIMEOUT_MS),
      });
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause);
      if (cause instanceof Error && cause.name === "TimeoutError") {
        throw new OllamaUnavailableError(
          `Ollama request timed out after ${EMBEDDING_TIMEOUT_MS}ms (${baseUrl})`,
        );
      }
      throw new OllamaUnavailableError(`Ollama unreachable at ${baseUrl}: ${reason}`);
    }

    type OllamaEmbedPayload = { error?: { message?: string }; embeddings?: unknown };
    let payload: OllamaEmbedPayload | null = null;
    try {
      payload = (await res.json()) as OllamaEmbedPayload;
    } catch {
      payload = null;
    }
    const errMsg = payload?.error?.message?.trim();

    if (!res.ok) {
      if (res.status === 404 || /not found|pull it first/i.test(errMsg ?? "")) {
        throw new OllamaModelNotFoundError(
          errMsg || `Ollama model "${model}" not found (HTTP ${res.status})`,
        );
      }
      if (res.status >= 500) {
        throw new OllamaUnavailableError(
          `Ollama server error (${res.status})${errMsg ? `: ${errMsg}` : ""}`,
        );
      }
      throw new OllamaResponseFormatError(
        `Ollama request failed (${res.status})${errMsg ? `: ${errMsg}` : ""}`,
      );
    }

    if (!payload || !Array.isArray(payload.embeddings)) {
      throw new OllamaResponseFormatError(
        `Ollama response missing "embeddings" array (${baseUrl})`,
      );
    }
    if (payload.embeddings.length !== inputs.length) {
      throw new OllamaResponseFormatError(
        `Ollama returned ${payload.embeddings.length} embeddings for ${inputs.length} inputs`,
      );
    }
    for (const v of payload.embeddings) {
      if (!Array.isArray(v)) {
        throw new OllamaResponseFormatError("Ollama returned a non-array embedding");
      }
      if (v.length !== EMBEDDING_DIMENSION) {
        throw new EmbeddingDimensionError(
          `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSION}, got ${v.length}`,
        );
      }
    }
    return payload.embeddings as number[][];
  }
}

/* --------------------------------------------------------------------------
 * Provider facade — the rest of the app calls these, never provider internals.
 * -------------------------------------------------------------------------- */

const cache = new Map<string, Promise<number[]>>();

function getProvider(): EmbeddingProvider {
  return new OllamaEmbeddingProvider();
}

/**
 * Embeds a single text. Throws typed errors when not configured, on
 * transport/server/model failures, or on any dimension != 1536.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cached = cache.get(text);
  if (cached) return cached;

  const task = getProvider()
    .generateEmbedding(text)
    .catch((err) => {
      // Negative results must not poison the cache.
      cache.delete(text);
      throw err;
    });
  if (cache.size >= CACHE_CAP) {
    const oldest = cache.keys().next().value as string;
    cache.delete(oldest);
  }
  cache.set(text, task);
  return task;
}

/** Embeds many texts in provider batches (max EMBEDDING_BATCH/request). */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  return getProvider().generateEmbeddings(texts);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}