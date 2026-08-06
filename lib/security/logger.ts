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

async function report(opts: {
  context: string;
  level: LogLevel;
  err: unknown;
  meta?: Record<string, unknown>;
}) {
  const e = opts.err instanceof Error ? opts.err : new Error(String(opts.err ?? "unknown"));
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
      console.error("[servis-sity]", JSON.stringify(entry));
    } else {
      console.warn("[servis-sity]", JSON.stringify(entry));
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