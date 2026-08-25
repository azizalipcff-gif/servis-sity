import { NextResponse } from "next/server";
import { logError } from "./logger";

export function jsonOk(data: unknown = { ok: true }): NextResponse {
  return NextResponse.json(data);
}

/** Consistent, minimal error envelope. Never leaks internal detail. */
export function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status });
}

/**
 * Dev-only diagnostic: surface the real PostgREST/Supabase error (code,
 * message, details, hint) in server logs when an insert/query fails. Never
 * called in production so secrets/values are not written to logs. The
 * user-facing response stays generic via `jsonError`.
 */
export function logDbError(context: string, err: unknown): void {
  if (process.env.NODE_ENV === "production") return;
  const e = err as
    | { code?: string; message?: string; details?: string; hint?: string }
    | null
    | undefined;
  if (!e || typeof e !== "object") return;
  const parts = [
    e.code && `code=${e.code}`,
    e.message,
    e.details && `details=${e.details}`,
    e.hint && `hint=${e.hint}`,
  ].filter(Boolean);
  if (parts.length) console.error(`[db-error] ${context}: ${parts.join(" | ")}`);
}

/**
 * Wraps a route handler so every unexpected exception is logged centrally and
 * surfaced to the client as an opaque 500 (never stack traces / messages).
 */
export async function withErrorCapture(
  context: string,
  fn: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    logError(`api.${context}`, err);
    return jsonError(500, "internal_error");
  }
}