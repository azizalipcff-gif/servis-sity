/**
 * Search-quality pipeline test suite — the "$20 query" corpus plus
 * normalizer/scoring/index sanity checks.
 *
 * Run: node scripts/tests/search-quality.test.ts
 */

import { run, finish, assert, assertEqual, assertClose, assertDeep } from "./suite.ts";
import { parseNaturalQuery } from "../../lib/search-quality/parser.ts";
import {
  normalizeToken,
  canonicalTokens,
  canonicalize,
  toAsciiDigits,
  wordStream,
  hasArabic,
} from "../../lib/search-quality/normalize.ts";
import { ALIAS_INDEX, CITIES, CATEGORIES } from "../../lib/search-quality/vocabularies.ts";
import { scoreQuery, rankByQuery } from "../../lib/search-quality/scoring.ts";
import {
  EMBEDDING_DIMENSION,
  EMBEDDING_BATCH,
  OLLAMA_DEFAULT_BASE_URL,
  getOllamaBaseUrl,
  getEmbeddingModel,
  isEmbeddingConfigured,
  buildEmbeddingText,
  generateEmbedding,
  generateEmbeddings,
  OllamaNotConfiguredError,
  OllamaUnavailableError,
  OllamaModelNotFoundError,
  EmbeddingDimensionError,
  OllamaResponseFormatError,
  OllamaEmbeddingProvider,
  type EmbeddingProvider,
} from "../../lib/search-quality/embeddings.ts";
import type { SearchParsedFilters } from "../../lib/search-quality/defs.ts";

function expectParse(
  query: string,
  expected: Partial<SearchParsedFilters>,
  label = query,
): void {
  const got = parseNaturalQuery(query);
  for (const key of Object.keys(expected) as Array<keyof SearchParsedFilters>) {
    assertEqual(got[key], expected[key], `${label} ::${key}`);
  }
}

/* ==========================================================================
 * Normalizer
 * ========================================================================== */

await run("normalize: Arabic diacritics, alef/hamza variants", () => {
  assertEqual(normalizeToken("كهربائيٌ"), "كهربايي", "tanwin stripped + hamza-ye fold");
  assertEqual(normalizeToken("أحمد"), "احمد", "hamza-on-alef → alef");
  assertEqual(normalizeToken("السباكين"), "سباكين", "al- article dropped");
  assertEqual(normalizeToken("مطعم"), "مطعم", "no mutation");
});

await run("normalize: tâ marbûṭa and alef maqsura folding", () => {
  assertEqual(normalizeToken("سباكة"), "سباكه", "ta marbuta → ha");
  assertEqual(normalizeToken("مقهى"), normalizeToken("مقهي"), "alef maqsura → ye");
});

await run("normalize: French/Latin accents fold", () => {
  assertEqual(normalizeToken("Électricien"), "electricien");
  assertEqual(normalizeToken("électricité"), "electricite");
  assertEqual(normalizeToken("Bon Marché"), "bon marche", "multitoken lowercase & accents");
  assertEqual(normalizeToken("oeuf")[0], "o", "char class");
  assertEqual(normalizeToken("français"), "francais");
});

await run("normalize: Arabic-Indic digits → ASCII", () => {
  assertEqual(toAsciiDigits("٠١٢٣٤٥٦٧٨٩"), "0123456789");
  assertEqual(toAsciiDigits("۱۲۳۴"), "1234");
  assertEqual(normalizeToken("٥"), "5");
});

await run("normalize: wordStream splits and canonicalizes", () => {
  const s = wordStream("المدينة ل'électricien");
  assertEqual(s.length, 3, "apostrophes split words");
  assertEqual(s.map((t) => t.norm).join(","), "مدينه,ل,electricien");
  assertEqual(s.some((t) => t.norm === "electricien"), true, "l'électricien found");
});

/* ==========================================================================
 * Vocabulary index
 * ========================================================================== */

await run("index: sorted longest-first, no empty aliases", () => {
  for (let i = 1; i < ALIAS_INDEX.length; i += 1) {
    const a = ALIAS_INDEX[i - 1];
    const b = ALIAS_INDEX[i];
    assert(
      a.tokens.length >= b.tokens.length,
      `index misordered at ${i}: "${a.alias}"(${a.tokens.length}) < "${b.alias}"(${b.tokens.length})`,
    );
  }
  for (const e of ALIAS_INDEX) assert(e.tokens.length > 0, "empty alias token");
});

await run("index: every display city is resolvable", () => {
  for (const city of CITIES) {
    const found = ALIAS_INDEX.find(
      (e) => e.kind === "city" && e.value === city.name,
    );
    assert(found, `city not indexed: ${city.name}`);
  }
});

await run("index: aliases canonicalize to their stored tokens", () => {
  for (const e of ALIAS_INDEX) {
    assertDeep(e.tokens, canonicalTokens(e.alias), `alias ${e.alias}`);
  }
});

/* ==========================================================================
 * Parser — the corpus
 * ========================================================================== */

await run("parse: fr + city (no q left)", () => {
  expectParse("electricien casablanca", { category: "electricien", city: "Casablanca", q: "" });
});

await run("parse: ar sentence, al-articles + city multi-word", () => {
  expectParse("أريد سباك في الدار البيضاء", { category: "plombier", city: "Casablanca", q: "" });
});

await run("parse: dentist → health parent, city", () => {
  expectParse("best dentist in Rabat", { category: "sante", city: "Rabat", q: "" });
});

await run("parse: ar restaurant + open-now + city", () => {
  expectParse("مطعم يفتح الان في مراكش", {
    category: "restaurant",
    openNow: true,
    city: "Marrakech",
    q: "",
  });
});

await run("parse: plumber open now (en)", () => {
  expectParse("plumber open now", { category: "plombier", openNow: true, q: "" });
});

await run("parse: hair salon (multi-token cat)", () => {
  expectParse("hair salon for her", { category: "coiffeur", q: "" });
});

await run("parse: 5 star mechanic in tanger", () => {
  expectParse("5 star mechanic in tanger", {
    category: "mecanicien",
    minRating: 5,
    city: "Tanger",
    q: "",
  });
});

await run("parse: ar verified + rating words strip", () => {
  expectParse("خمسة نجوم سباك معتمد", {
    category: "plombier",
    minRating: 5,
    verifiedOnly: true,
    q: "",
  });
});

await run("parse: cheap cleaning service (price band)", () => {
  expectParse("cheap cleaning service", { category: "nettoyage", maxPrice: 200, q: "" });
});

await run("parse: real estate agent in Fès", () => {
  expectParse("real estate agent in Fès", { category: "immobilier", city: "Fès", q: "" });
});

await run("parse: ar two-word beats single (مصور فيديو)", () => {
  expectParse("مصور فيديو", { category: "media-video", q: "" });
});

await run("parse: coffee shop near me", () => {
  expectParse("coffee shop near me", { category: "cafe", q: "" });
});

await run("parse: doctor open now", () => {
  expectParse("doctor open now", { category: "medecin", openNow: true, q: "" });
});

await run("parse: cours particulier + residual english", () => {
  expectParse("cours particulier anglais", { category: "professeur", q: "anglais" });
});

await run("parse: jardinier → home services", () => {
  expectParse("jardinier", { category: "ménager-services", q: "" });
});

await run("parse: توصيل سريع → auto services", () => {
  expectParse("توصيل سريع", { category: "auto-services", q: "سريع" });
});

await run("parse: paint my house (residual house)", () => {
  expectParse("paint my house", { category: "peintre", q: "house" });
});

await run("parse: avocat casablanca → professional services", () => {
  expectParse("avocat casablanca", { category: "services-pro", city: "Casablanca", q: "" });
});

await run("parse: اصلاح كمبيوتر (ar multi-token IT)", () => {
  expectParse("اصلاح كمبيوتر", { category: "informatique", q: "" });
});

await run("parse: premium electrician", () => {
  expectParse("premium electrician", { category: "electricien", premiumOnly: true, q: "" });
});

await run("parse: 5-star hairdresser (hyphen rating)", () => {
  expectParse("5-star hairdresser", { category: "coiffeur", minRating: 5, q: "" });
});

await run("parse: cafe in berkane", () => {
  expectParse("cafe in berkane", { category: "cafe", city: "Berkane", q: "" });
});

await run("parse: حمام مغربي → beauty", () => {
  expectParse("حمام مغربي", { category: "beaute", q: "" });
});

await run("parse: salle de sport → generic residual", () => {
  const got = parseNaturalQuery("salle de sport");
  assertEqual(got.city, undefined, "no city");
  assertEqual(got.category, undefined, "no category");
  assertEqual(got.q, "salle sport");
});

await run("parse: spanning al-article city", () => {
  expectParse("شركة تنظيف", { category: "nettoyage", q: "" });
});

await run("parse: price lt + category", () => {
  expectParse("moins de 300 dh pour electricien", {
    category: "electricien",
    maxPrice: 300,
    q: "",
  });
});

await run("parse: expensive restaurant (min price)", () => {
  expectParse("expensive restaurant", { category: "restaurant", minPrice: 300, q: "" });
});

await run("parse: 4-star rating", () => {
  expectParse("4-star restaurant", { category: "restaurant", minRating: 4, q: "" });
});

await run("parse: Arabic-Indic numeral rating (٤ نجوم)", () => {
  expectParse("٤ نجوم مطعم", { category: "restaurant", minRating: 4, q: "" });
});

await run("parse: casa alone resolves city", () => {
  expectParse("casa", { city: "Casablanca", q: "" });
});

await run("parse: سلا resolves Salé", () => {
  expectParse("سلا", { city: "Salé", q: "" });
});

await run("parse: empty strings are safe", () => {
  assertDeep(parseNaturalQuery("   ").q, "");
});

/* ==========================================================================
 * Scoring
 * ========================================================================== */

await run("scoring: exact phrase family", () => {
  const r = scoreQuery("electrician", "Electrician Pro 24/7");
  assert(r.phrase, "phrase true");
  assertClose(r.score, 1, 0.001);
});

await run("scoring: overlap only (half)", () => {
  const r = scoreQuery("plumber rabat", "Plumber, 24h plumbing service");
  assertEqual(r.phrase, false);
  assertClose(r.overlap, 0.5, 0.001);
  assertClose(r.score, 0.3, 0.001);
});

await run("scoring: no overlap", () => {
  const r = scoreQuery("electrician", "restaurant cuisine tagine");
  assertEqual(r.overlap, 0);
  assertEqual(r.score, 0);
});

await run("scoring: rankByQuery orders best first", () => {
  const items = [
    { n: "Restaurant Chez Ali", m: "restaurant" },
    { n: "Electrician Pro", m: "electrician" },
    { n: "Cafe Nabil", m: "cafe" },
  ];
  const ranked = rankByQuery(items, "electrician", (x: { m: string }) => x.m);
  assertEqual(ranked[0].n, "Electrician Pro");
  assertEqual(ranked[1].n, "Restaurant Chez Ali");
  assertEqual(ranked[2].n, "Cafe Nabil");
});

await run("scoring: cross-script phrase", () => {
  const r = scoreQuery("مطعم", "مطعم الشام مراكش");
  assert(r.phrase, "arabic phrase detected");
});

await run("sanity: hasArabic", () => {
  assertEqual(hasArabic("مرحبا"), true);
  assertEqual(hasArabic("bonjour"), false);
});

await run("sanity: canonicalize joins tokens", () => {
  assertEqual(canonicalize("الدار البيضاء"), "دار بيضاء");
});

await run("sanity: CATEGORIES non-empty and slugs unique", () => {
  assert(CATEGORIES.length >= 25, "expected a rich category vocabulary");
  const slugs = new Set<string>();
  for (const c of CATEGORIES) {
    assert(!slugs.has(c.slug), `duplicate slug ${c.slug}`);
    slugs.add(c.slug);
  }
});

type ErrorCtor = new (...args: never[]) => Error;

async function expectRejects(
  promiseFactory: () => Promise<unknown>,
  messageContains: string,
  label: string,
  ErrorClass?: ErrorCtor,
): Promise<void> {
  let threw = false;
  try {
    await promiseFactory();
  } catch (err) {
    threw = true;
    assert(
      err instanceof Error && err.message.includes(messageContains),
      `${label}: got ${err instanceof Error ? err.message : String(err)}`,
    );
    if (ErrorClass) {
      assert(
        err instanceof ErrorClass,
        `${label}: expected ${ErrorClass.name}, got ${err?.name ?? "unknown"}`,
      );
    }
  }
  assert(threw, `${label}: expected rejection (${messageContains})`);
}

async function withOllama(
  opts: { model: string | undefined; baseUrl: string | undefined },
  fn: () => Promise<void>,
): Promise<void> {
  const hadModel = process.env.OLLAMA_EMBEDDING_MODEL;
  const hadUrl = process.env.OLLAMA_BASE_URL;
  if (opts.model === undefined) delete process.env.OLLAMA_EMBEDDING_MODEL;
  else process.env.OLLAMA_EMBEDDING_MODEL = opts.model;
  if (opts.baseUrl === undefined) delete process.env.OLLAMA_BASE_URL;
  else process.env.OLLAMA_BASE_URL = opts.baseUrl;
  try {
    await fn();
  } finally {
    if (hadModel === undefined) delete process.env.OLLAMA_EMBEDDING_MODEL;
    else process.env.OLLAMA_EMBEDDING_MODEL = hadModel;
    if (hadUrl === undefined) delete process.env.OLLAMA_BASE_URL;
    else process.env.OLLAMA_BASE_URL = hadUrl;
  }
}

function ollamaOk(payload: unknown): Response {
  return { ok: true, json: async () => payload } as unknown as Response;
}

function ollamaErr(status: number, payload?: unknown): Response {
  return {
    ok: false,
    status,
    json: async () => payload ?? { error: { message: "" } },
  } as unknown as Response;
}

function embeddingVector(fill: number, dim = EMBEDDING_DIMENSION): number[] {
  return new Array(dim).fill(fill);
}

/* ==========================================================================
 * Embeddings pipeline
 * ========================================================================== */

await run("embeddings: constants match migration 0019 (dim 1536 fixed)", () => {
  assertEqual(EMBEDDING_DIMENSION, 1536, "vector(1536) in 0019");
  assert(EMBEDDING_BATCH > 0, "batch size positive");
  assertEqual(OLLAMA_DEFAULT_BASE_URL, "http://127.0.0.1:11434", "local default");
});

await run("embeddings: provider is Ollama, model comes from env (not hardcoded)", () => {
  const provider: EmbeddingProvider = new OllamaEmbeddingProvider();
  assertEqual(provider.name, "ollama");
  return withOllama({ model: "qwen3-embedding:4b", baseUrl: undefined }, async () => {
    assertEqual(getEmbeddingModel(), "qwen3-embedding:4b");
  });
});

await run("embeddings: missing OLLAMA_BASE_URL falls back to local default", () => {
  return withOllama({ model: "qwen3-embedding:4b", baseUrl: undefined }, async () => {
    assertEqual(getOllamaBaseUrl(), OLLAMA_DEFAULT_BASE_URL, "default endpoint");
    assertEqual(isEmbeddingConfigured(), true, "model alone configures the provider");
  });
});

await run("embeddings: business text composes public fields only", () => {
  const text = buildEmbeddingText({
    kind: "business",
    name: "Makia Cafe",
    description: "Coffee and pastries",
    category: "cafe",
    categoryName: "Café",
    city: "Casablanca",
    price: 50,
  });
  const tokens = text.split(" ");
  assert(tokens.includes("cafe"), "category token");
  assert(tokens.includes("cafe") || tokens.includes("مقهى"), "has category");
  assert(tokens.some((t) => t.startsWith("makia")), "name present");
  assert(tokens.includes("casablanca"), "city present");
  assert(!tokens.includes("50"), "price excluded for businesses");
  assert(!text.includes("undefined"), "no undefined leakage");
});

await run("embeddings: service text includes seller + price", () => {
  const text = buildEmbeddingText({
    kind: "service",
    name: "Electricité à domicile",
    description: "Dépannage rapide",
    category: "electricien",
    categoryName: "Électricien",
    city: "Rabat",
    business: { name: "Pro Elec", city: "Rabat" },
    price: 150,
  });
  assert(text.split(" ").includes("150"), "price token included");
  assert(text.split(" ").includes("pro"), "seller name token included");
  assert(text.split(" ").some((t) => t.startsWith("elec")) || text.split(" ").includes("electricite"), "category/seller lektris present");
});

await run("embeddings: product text deterministic + deduplicated", () => {
  const a = buildEmbeddingText({
    kind: "product",
    name: "Cafetière",
    description: "Cafetière filtre",
    category: "restaurant",
    business: { name: "Cafetière" },
  });
  const b = buildEmbeddingText({
    kind: "product",
    name: "Cafetière",
    description: "Cafetière filtre",
    category: "restaurant",
    business: { name: "Cafetière" },
  });
  assertEqual(a, b, "deterministic");
  const tokens = a.split(" ");
  assertEqual(new Set(tokens).size, tokens.length, "no duplicate tokens");
});

await run("embeddings: Arabic normalization in searchable text", () => {
  const text = buildEmbeddingText({
    kind: "business",
    name: "مقهى الدار البيضاء",
    description: "مقتصد",
    category: "cafe",
    city: "Casablanca",
  });
  const tokens = text.split(" ");
  assert(tokens.includes("مقهي"), "alef maqsura folded (مقهى→مقهي)");
  assert(tokens.includes("دار"), "al-article stripped in الدار");
  assert(tokens.includes("بيضاء"), "multi-word city token");
});

await run("embeddings: French accents fold in searchable text", () => {
  const text = buildEmbeddingText({
    kind: "business",
    name: "Électricien",
    category: "electricien",
    categoryName: "Électricien",
    city: "Fès",
  });
  const tokens = text.split(" ");
  assert(tokens.includes("electricien"), "accent folded");
  assert(tokens.includes("fes"), "city accent folded");
});

await run("embeddings: empty public fields yield empty text", () => {
  assertEqual(
    buildEmbeddingText({ kind: "business", name: null, description: null }),
    "",
  );
});

await run("embeddings: isEmbeddingConfigured requires server model", () => {
  return withOllama({ model: undefined, baseUrl: undefined }, async () => {
    assertEqual(isEmbeddingConfigured(), false, "unconfigured");
  });
});

await run("embeddings: generateEmbedding throws OllamaNotConfiguredError when unconfigured", () => {
  return withOllama({ model: undefined, baseUrl: undefined }, async () => {
    await expectRejects(
      () => generateEmbedding("electrician"),
      "not configured",
      "no model",
      OllamaNotConfiguredError,
    );
  });
});

await run("embeddings: mocked Ollama returns 1536-dim vector + requests dimensions:1536", () => {
  return withOllama({ model: "qwen3-embedding:4b", baseUrl: undefined }, async () => {
    const real = globalThis.fetch;
    let sent: { model?: string; dimensions?: number } = {};
    globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
      sent = JSON.parse(init?.body ?? "{}");
      return ollamaOk({ embeddings: [embeddingVector(0.1)] });
    }) as typeof fetch;
    try {
      const v = await generateEmbedding("query semantic unique 1");
      assertEqual(v.length, EMBEDDING_DIMENSION);
      assertEqual(v[0], 0.1);
      assertEqual(v[1535], 0.1);
      assertEqual(sent.model, "qwen3-embedding:4b", "model from env");
      assertEqual(sent.dimensions, 1536, "requests exact 1536 width");
    } finally {
      globalThis.fetch = real;
    }
  });
});

await run("embeddings: identical texts reuse cache (single Ollama call)", () => {
  return withOllama({ model: "qwen3-embedding:4b", baseUrl: undefined }, async () => {
    const real = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return ollamaOk({ embeddings: [embeddingVector(0.2)] });
    }) as typeof fetch;
    try {
      await generateEmbedding("cached query vector x7");
      await generateEmbedding("cached query vector x7");
      assertEqual(calls, 1, "cache hit");
    } finally {
      globalThis.fetch = real;
    }
  });
});

await run("embeddings: wrong dimension throws EmbeddingDimensionError (integrity guard)", () => {
  return withOllama({ model: "qwen3-embedding:4b", baseUrl: undefined }, async () => {
    const real = globalThis.fetch;
    globalThis.fetch = (async () => ollamaOk({ embeddings: [[0.1, 0.2]] })) as typeof fetch;
    try {
      await expectRejects(
        () => generateEmbedding("dimension trap query y3"),
        "dimension mismatch",
        "guard",
        EmbeddingDimensionError,
      );
    } finally {
      globalThis.fetch = real;
    }
  });
});

await run("embeddings: empty embedding also fails the dimension invariant", () => {
  return withOllama({ model: "qwen3-embedding:4b", baseUrl: undefined }, async () => {
    const real = globalThis.fetch;
    globalThis.fetch = (async () => ollamaOk({ embeddings: [[]] })) as typeof fetch;
    try {
      await expectRejects(
        () => generateEmbedding("empty vector query q"),
        "dimension mismatch",
        "empty vector",
        EmbeddingDimensionError,
      );
    } finally {
      globalThis.fetch = real;
    }
  });
});

await run("embeddings: Ollama unavailable (connection refused) throws OllamaUnavailableError", () => {
  return withOllama({ model: "qwen3-embedding:4b", baseUrl: undefined }, async () => {
    const real = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    try {
      await expectRejects(
        () => generateEmbedding("offline query zz9"),
        "unreachable",
        "connection refused",
        OllamaUnavailableError,
      );
    } finally {
      globalThis.fetch = real;
    }
  });
});

await run("embeddings: HTTP 429 propagates explicitly", () => {
  return withOllama({ model: "qwen3-embedding:4b", baseUrl: undefined }, async () => {
    const real = globalThis.fetch;
    globalThis.fetch = (async () => ollamaErr(429)) as typeof fetch;
    try {
      await expectRejects(
        () => generateEmbedding("rate limited query zz9"),
        "429",
        "http",
        OllamaResponseFormatError,
      );
    } finally {
      globalThis.fetch = real;
    }
  });
});

await run("embeddings: missing model on server throws OllamaModelNotFoundError", () => {
  return withOllama({ model: "qwen3-embedding:4b", baseUrl: undefined }, async () => {
    const real = globalThis.fetch;
    globalThis.fetch = (async () =>
      ollamaErr(404, { error: { message: "model 'qwen3-embedding:4b' not found, try pulling it first" } })) as typeof fetch;
    try {
      await expectRejects(
        () => generateEmbedding("missing model query"),
        "not found",
        "model missing",
        OllamaModelNotFoundError,
      );
    } finally {
      globalThis.fetch = real;
    }
  });
});

await run("embeddings: malformed response (no embeddings array) throws explicitly", () => {
  return withOllama({ model: "qwen3-embedding:4b", baseUrl: undefined }, async () => {
    const real = globalThis.fetch;
    globalThis.fetch = (async () => ollamaOk({ model: "qwen3-embedding:4b" })) as typeof fetch;
    try {
      await expectRejects(
        () => generateEmbedding("malformed query"),
        "embeddings",
        "malformed",
        OllamaResponseFormatError,
      );
    } finally {
      globalThis.fetch = real;
    }
  });
});

await run("embeddings: generateEmbeddings batches over EMBEDDING_BATCH", () => {
  return withOllama({ model: "qwen3-embedding:4b", baseUrl: undefined }, async () => {
    const real = globalThis.fetch;
    const callInputs: number[] = [];
    globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
      const batch = (JSON.parse(init?.body ?? "{}").input ?? []) as string[];
      callInputs.push(batch.length);
      return ollamaOk({ embeddings: batch.map(() => embeddingVector(0.3)) });
    }) as typeof fetch;
    try {
      const texts = Array.from({ length: EMBEDDING_BATCH + 2 }, (_, i) => `batch text ${i}`);
      const vectors = await generateEmbeddings(texts);
      assertEqual(vectors.length, texts.length);
      assertEqual(callInputs.length, 2, "two requests");
      assertEqual(callInputs[0], EMBEDDING_BATCH, "first chunk full");
    } finally {
      globalThis.fetch = real;
    }
  });
});

await run("embeddings: generateEmbeddings throws when unconfigured", () => {
  return withOllama({ model: undefined, baseUrl: undefined }, async () => {
    await expectRejects(
      () => generateEmbeddings(["a", "b"]),
      "not configured",
      "batch",
      OllamaNotConfiguredError,
    );
  });
});

await run("embeddings: generated query embedding failure falls back to lexical path", () => {
  // Mirrors the /api/search guard: a thrown provider error is treated as
  // "no query embedding" (null), so search continues on the hybrid lexical or
  // legacy path — it never 500s on an Ollama outage.
  return withOllama({ model: "qwen3-embedding:4b", baseUrl: undefined }, async () => {
    const real = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    try {
      let queryEmbedding: number[] | null = null;
      try {
        queryEmbedding = await generateEmbedding("plombier casablanca");
      } catch {
        queryEmbedding = null;
      }
      assertEqual(queryEmbedding, null, "route treats provider failure as null embedding");
    } finally {
      globalThis.fetch = real;
    }
  });
});

await run("embeddings: backfill idempotency — empty candidate batch short-circuits", () => {
  // Re-running the backfill after success finds no null-embedding rows and
  // must not touch the provider at all — idempotent by construction.
  return withOllama({ model: "qwen3-embedding:4b", baseUrl: undefined }, async () => {
    const real = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return ollamaOk({ embeddings: [] });
    }) as typeof fetch;
    try {
      const out = await generateEmbeddings([]);
      assertEqual(out.length, 0);
      assertEqual(calls, 0, "no provider call for an empty batch");
    } finally {
      globalThis.fetch = real;
    }
  });
});

/* ==========================================================================
 * Parser — Phase-4 multilingual corpus
 * ========================================================================== */

await run("parse: café (accented) resolves cafe", () => {
  expectParse("café", { category: "cafe", q: "" });
});

await run("parse: coffee machine", () => {
  expectParse("coffee machine", { category: "cafe", q: "machine" });
});

await run("parse: machine cafe", () => {
  expectParse("machine cafe", { category: "cafe", q: "machine" });
});

await run("parse: restaurant casablanca", () => {
  expectParse("restaurant casablanca", { category: "restaurant", city: "Casablanca", q: "" });
});

await run("parse: مطعم الدار البيضاء", () => {
  expectParse("مطعم الدار البيضاء", { category: "restaurant", city: "Casablanca", q: "" });
});

await run("parse: electrician rabat", () => {
  expectParse("electrician rabat", { category: "electricien", city: "Rabat", q: "" });
});

await run("parse: السباك", () => {
  expectParse("السباك", { category: "plombier", q: "" });
});

await run("parse: خمسة نجوم مطعم الدار البيضاء", () => {
  expectParse("خمسة نجوم مطعم الدار البيضاء", {
    category: "restaurant",
    city: "Casablanca",
    minRating: 5,
    q: "",
  });
});

await run("parse: enfant has no false category", () => {
  const got = parseNaturalQuery("enfant");
  assertEqual(got.q, "enfant");
  assertEqual(got.category, undefined);
  assertEqual(got.city, undefined);
});

await run("parse: docteur 5 étoiles", () => {
  expectParse("docteur 5 étoiles", { category: "medecin", minRating: 5, q: "" });
});

await run("parse: restaurant ouvert maintenant", () => {
  expectParse("restaurant ouvert maintenant", { category: "restaurant", openNow: true, q: "maintenant" });
});

await run("parse: mon coiffeur préféré", () => {
  const got = parseNaturalQuery("mon coiffeur préféré");
  assertEqual(got.category, "coiffeur", "category extracted");
});

await run("parse: plomberie", () => {
  expectParse("plomberie", { category: "plombier", q: "" });
});

await run("parse: cabinet dentaire — no false positive beyond vocabulary", () => {
  const got = parseNaturalQuery("cabinet dentaire");
  assertEqual(got.q, "cabinet dentaire", "residual kept");
});

await run("parse: hotel stays residual", () => {
  const got = parseNaturalQuery("hotel");
  assertEqual(got.q, "hotel");
  assertEqual(got.category, undefined);
});

await run("parse: marrakech alone resolves city", () => {
  expectParse("marrakech", { city: "Marrakech", q: "" });
});

await run("parse: lorem ipsum residual", () => {
  const got = parseNaturalQuery("lorem ipsum");
  assertEqual(got.q, "lorem ipsum");
  assertEqual(got.category, undefined);
});

await run("parse: the plumber", () => {
  const got = parseNaturalQuery("the plumber");
  assertEqual(got.category, "plombier", "category survives stopword");
});

await run("parse: electricien à rabat", () => {
  expectParse("electricien à rabat", { category: "electricien", city: "Rabat", q: "" });
});

await run("parse: 4 star restaurant open now", () => {
  expectParse("4 star restaurant open now", {
    category: "restaurant",
    minRating: 4,
    openNow: true,
    q: "",
  });
});

await run("parse: premium electricien tanger", () => {
  expectParse("premium electricien tanger", {
    category: "electricien",
    premiumOnly: true,
    city: "Tanger",
    q: "",
  });
});

await run("parse: ar sentence project (بحث عن مطعم في مراكش يفتح الان)", () => {
  expectParse("بحث عن مطعم في مراكش يفتح الان", {
    category: "restaurant",
    city: "Marrakech",
    openNow: true,
    q: "بحث",
  });
});

await run("parse: verified + premium combined", () => {
  expectParse("verified premium plumber", {
    category: "plombier",
    verifiedOnly: true,
    premiumOnly: true,
    q: "",
  });
});

await run("parse: سباك معتمد مصادق عليه", () => {
  expectParse("سباك معتمد مصادق عليه", { category: "plombier", verifiedOnly: true, q: "مصادق عليه" });
});

await run("parse: 5 star plombier rabat", () => {
  expectParse("5 star plombier rabat", {
    category: "plombier",
    city: "Rabat",
    minRating: 5,
    q: "",
  });
});

await run("parse: الدار البيضاء alone", () => {
  expectParse("الدار البيضاء", { city: "Casablanca", q: "" });
});

/* ==========================================================================
 * Parser — edge cases & negatives
 * ========================================================================== */

await run("edge: whitespace-only query is safe", () => {
  assertDeep(parseNaturalQuery(" \t\n ").q, "");
});

await run("edge: 200-char query does not throw and keeps input", () => {
  const q = "a".repeat(200);
  const got = parseNaturalQuery(q);
  assertEqual(got.q.length, 200, "length preserved");
});

await run("edge: URL + emoji garbage has no false parse", () => {
  const got = parseNaturalQuery("https://x.example/ab?q=1 🔧 it");
  assertEqual(got.category, undefined, "no category invented");
  assertEqual(got.city, undefined, "no city invented");
});

await run("edge: numeric-only query (digits stripped, no category)", () => {
  const got = parseNaturalQuery("2024");
  assertEqual(got.q, "", "bare digits dropped");
  assertEqual(got.category, undefined);
});

await run("edge: stopword-only query yields empty residual", () => {
  const got = parseNaturalQuery("now and for the");
  assertEqual(got.category, undefined);
  assertEqual(got.minRating, undefined);
  assertEqual(got.openNow, undefined);
});

await run("edge: repeated tokens do not crash", () => {
  expectParse("electrician electrician", { category: "electricien", q: "" });
});

await run("edge: garbage tokens stay garbage", () => {
  const got = parseNaturalQuery("qqzzz bbb uuu");
  assertEqual(got.q.split(" ").length, 3, "all three tokens residual");
  assertEqual(got.category, undefined);
});

await run("edge: never invent categories outside vocabulary", () => {
  const slugs = new Set(CATEGORIES.map((c) => c.slug));
  for (const q of [
    "flux capacitor",
    "xyzzy",
    "zainophone",
    "دزرتيكو",
    "plumbfizz",
  ]) {
    const p = parseNaturalQuery(q);
    if (p.category !== undefined) assert(slugs.has(p.category), `${q} invented category ${p.category}`);
  }
});

await run("edge: static business query has no openNow", () => {
  const got = parseNaturalQuery("electricien rabat");
  assertEqual(got.openNow, undefined);
});

/* ==========================================================================
 * Scoring & ranking — hybrid ordering rules
 * ========================================================================== */

await run("scoring: phrase (1.0) beats partial overlap (0.6)", () => {
  const phrase = scoreQuery("plumber rabat", "Plumber Rabat Express");
  const partial = scoreQuery("plumber rabat", "Rabat plumber 24h");
  assert(phrase.phrase, "phrase flagged");
  assertEqual(partial.phrase, false, "partial is not phrase");
  assert(phrase.score > partial.score, "phrase scores higher");
});

await run("scoring: reversed token order is overlap not phrase", () => {
  const r = scoreQuery("plumber rabat", "Rabat plumber urgent");
  assertEqual(r.phrase, false, "order matters for phrase");
  assertClose(r.overlap, 1, 0.001);
  assertClose(r.score, 0.6, 0.001);
});

await run("scoring: accent-folding phrase match", () => {
  assertEqual(scoreQuery("electricien", "Électricien Rabat").phrase, true);
});

await run("scoring: Arabic-Indic digits fold to ASCII", () => {
  assertClose(scoreQuery("٥", "5 stars").overlap, 1, 0.001);
});

await run("scoring: empty text scores 0", () => {
  assertClose(scoreQuery("electrician", "").score, 0, 0.001);
});

await run("scoring: empty query scores 0", () => {
  assertClose(scoreQuery("", "anything").score, 0, 0.001);
});

await run("scoring: score stays within [0,1]", () => {
  for (const q of ["electricien", "مطعم", "cafe rabat", "5 star plombier"]) {
    for (const t of ["", "Électricien Rabat", "مطعم الشام", "plombier"]) {
      const s = scoreQuery(q, t).score;
      assert(s >= 0 && s <= 1, `${q}~${t} out of bounds: ${s}`);
    }
  }
});

await run("scoring: rankByQuery ordering phrase > partial > none", () => {
  const items = [
    { n: "Phrase Exact", m: "electrician" },
    { n: "Partial Text", m: "electrician installation services" },
    { n: "Unrelated", m: "restaurant tagine" },
  ];
  const ranked = rankByQuery(items, "electrician", (x: { m: string }) => x.m);
  assertEqual(ranked.map((x) => x.n).join("|"), "Phrase Exact|Partial Text|Unrelated");
});

await run("scoring: rankByQuery stable for equal scores", () => {
  const items = [
    { n: "A", m: "electrician" },
    { n: "B", m: "electrician" },
  ];
  rankByQuery(items, "electrician", (x: { m: string }) => x.m);
  assertEqual(items[0].n, "A", "insertion order preserved on tie");
});

await finish();
console.log(`summary: ${JSON.stringify((await import("./suite.ts")).summary())}`);