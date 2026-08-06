import { NextResponse } from "next/server";
import { chatComplete, isAiConfigured } from "@/lib/ai/client";
import { buildSearchMatchPrompt } from "@/lib/ai/prompts";
import { z } from "zod";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/csrf";
import { withErrorCapture, jsonError } from "@/lib/security/http";
import { sanitizeText } from "@/lib/security/sanitize";

export const runtime = "nodejs";

const matchSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(500)
    .transform((v) => sanitizeText(v, 500)),
  businesses: z.array(z.record(z.unknown())).max(50).default([]),
});

export async function POST(request: Request) {
  return withErrorCapture("ai.searchMatch", async () => {
    if (!isAiConfigured()) return jsonError(501, "ai_not_configured");

    const rl = rateLimit(request, { key: "ai:search-match", limit: 30, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfter);
    if (!assertSameOrigin(request)) return jsonError(403, "csrf_rejected");

    const body = await request.json().catch(() => null);
    const parsed = matchSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request");
    const { query, businesses } = parsed.data;

    const prompt = buildSearchMatchPrompt(
      query,
      JSON.stringify(
        businesses.slice(0, 50).map((b) => ({
          business_id: String(b?.id ?? ""),
          name: sanitizeText(String(b?.name ?? ""), 100),
          category: String((b?.categories as Record<string, unknown> | null)?.["name_en"] ?? ""),
          city: String(b?.city ?? ""),
          rating: typeof b?.rating_avg === "number" ? b.rating_avg : 0,
        })),
      ),
    );

    try {
      const raw = await chatComplete(prompt);
      const parsedJson = parseJson(raw);

      if (!Array.isArray(parsedJson)) return jsonError(502, "bad_response");

      return NextResponse.json({
        suggestions: parsedJson.slice(0, 5).map((s) => ({
          business_id: String(s.business_id ?? "").slice(0, 64),
          reason: sanitizeText(String(s.reason ?? ""), 200),
        })),
      });
    } catch {
      return jsonError(502, "ai_failed");
    }
  });
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}