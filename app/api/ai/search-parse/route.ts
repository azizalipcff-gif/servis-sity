import { NextResponse } from "next/server";
import { isAiConfigured, chatComplete } from "@/lib/ai/client";
import { buildFilterParsePrompt } from "@/lib/ai/prompts";
import { parseNaturalQuery } from "@/lib/search/nl-parser";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError } from "@/lib/security/http";
import type { ParsedFilters } from "@/lib/search/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AI_CATEGORY_SLUGS = [
  "electricien",
  "plombier",
  "restaurant",
  "coiffeur",
  "mecanicien",
  "menuiserie",
  "peintre",
  "pharmacie",
  "medecin",
  "dentiste",
  "avocat",
  "transport",
  "nettoyage",
  "immobilier",
  "scolaire",
] as const;

type AiResponse = {
  q?: unknown;
  category?: unknown;
  city?: unknown;
  minRating?: unknown;
  verifiedOnly?: unknown;
  premiumOnly?: unknown;
  openNow?: unknown;
};

export async function POST(request: Request) {
  return withErrorCapture("ai.searchParse", async () => {
    const rl = rateLimit(request, { key: "ai:search-parse", limit: 60, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const body = await request.json().catch(() => null);
    const raw = typeof body?.query === "string" ? body.query.trim().slice(0, 500) : "";

    if (!raw) return jsonError(400, "bad_request");

  // Deterministic, offline-safe baseline so the feature works with or without
  // an AI key. AI (when configured) only sharpens the result.
  const heuristic = parseNaturalQuery(raw);
  let merged: ParsedFilters = heuristic;
  let source: "ai" | "heuristic" = "heuristic";

  if (isAiConfigured()) {
    try {
      const reply = await chatComplete(buildFilterParsePrompt(raw));
      const parsed = parseAiResponse(reply);
      if (parsed) {
        merged = normalize(parsed);
        source = "ai";
      }
    } catch {
      // fall back to heuristic
    }
  }

  return NextResponse.json({ raw, filters: merged, source });
  });
}

function parseAiResponse(text: string): AiResponse | null {
  const candidate = text.replace(/```json|```/g, "").trim();
  const tryParse = (s: string) => {
    try {
      return JSON.parse(s) as unknown;
    } catch {
      return null;
    }
  };
  const direct = tryParse(candidate);
  if (direct && typeof direct === "object") return direct as AiResponse;
  const bracket = candidate.match(/\{[\s\S]*\}/);
  if (bracket) {
    const fromBracket = tryParse(bracket[0]);
    if (fromBracket && typeof fromBracket === "object") {
      return fromBracket as AiResponse;
    }
  }
  return null;
}

function normalize(parsed: AiResponse): ParsedFilters {
  const q = cleanString(parsed.q);
  const category = cleanCategory(parsed.category);
  const city = cleanString(parsed.city);
  const minRating = cleanRating(parsed.minRating);
  return {
    q: q ? q : (city || category ? "" : q),
    ...(city ? { city } : {}),
    ...(category ? { category } : {}),
    ...(minRating ? { minRating } : {}),
    ...(parsed.verifiedOnly ? { verifiedOnly: true } : {}),
    ...(parsed.premiumOnly ? { premiumOnly: true } : {}),
    ...(parsed.openNow ? { openNow: true } : {}),
  };
}

function cleanString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function cleanCategory(v: unknown): string {
  const s = cleanString(v).toLowerCase().replace(/\s+/g, "_");
  return (AI_CATEGORY_SLUGS as readonly string[]).includes(s) ? s : "";
}

function cleanRating(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : undefined;
}