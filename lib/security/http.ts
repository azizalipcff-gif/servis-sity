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