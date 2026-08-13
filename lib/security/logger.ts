/**
 * Centralized error logging.
 * Never throws and logs are written line-safely before any user response, so
 * internal details never leak to clients. Best-effort persists to `system_logs`
 * for centralized monitoring (RLS is insert-only, see the SQL migration).
 */

export type LogLevel = "error" | "warn";

export function logError(
  context: string,
  err: unknown,
  meta?: Record<string, unknown>,
): void {
  void report({ context, level: "error", err, meta });
}

export function logWarn(
  context: string,
  message: string,
  meta?: Record<string, unknown>,
): void {
  void report({ context, level: "warn", err: new Error(message), meta });
}

/**
 * PostgREST/Supabase errors are often plain objects (or PostgrestError) whose
 * useful fields are message/details/hint/code. `String(err)` on such an object
 * yields "[object Object]" and hides the actionable hint, so normalize them
 * into a real Error whose message keeps every field.
 */
function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (err && typeof err === "object") {
    const o = err as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [o.message, o.hint, o.details, o.code]
      .filter((p) => p !== null && p !== undefined && String(p).length > 0)
      .map((p) => String(p));
    if (parts.length) return new Error(parts.join(" | "));
  }
  return new Error(String(err ?? "unknown"));
}

async function report(opts: {
  context: string;
  level: LogLevel;
  err: unknown;
  meta?: Record<string, unknown>;
}) {
  const e = toError(opts.err);
  const entry = {
    at: new Date().toISOString(),
    context: opts.context,
    level: opts.level,
    message: e.message,
    stack: e.stack,
    meta: opts.meta,
  };

  try {
    if (opts.level === "error") {
      console.error("[service-city]", JSON.stringify(entry));
    } else {
      console.warn("[service-city]", JSON.stringify(entry));
    }
  } catch {
    // ignore
  }

  if (typeof window !== "undefined") return;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    await supabase.from("system_logs").insert({
      context: entry.context,
      level: entry.level,
      message: entry.message.slice(0, 4000),
      stack: entry.stack?.slice(0, 8000) ?? null,
      meta: entry.meta ?? null,
    });
  } catch {
    // logging must never fail the request
  }
}