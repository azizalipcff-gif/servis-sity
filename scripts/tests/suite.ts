/**
 * Minimal zero-dependency test runner for the search-quality suite.
 * Prints a TAP-ish summary and exits non-zero on any failure.
 */

type TestFn = () => void | Promise<void>;

let passCount = 0;
let failCount = 0;
let current = "";

export async function run(name: string, fn: TestFn): Promise<void> {
  current = name;
  try {
    await fn();
    passCount += 1;
    console.log(`ok    ${name}`);
  } catch (err) {
    failCount += 1;
    console.error(`FAIL  ${name}`);
    console.error(`      ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function finish(): Promise<void> {
  console.log("");
  console.log(`# ${passCount} passed, ${failCount} failed`);
  if (failCount > 0) process.exitCode = 1;
}

export function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

export function assertEqual(actual: unknown, expected: unknown, msg?: string): void {
  if (actual !== expected) {
    throw new Error(
      `${msg ? msg + ": " : ""}expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

export function assertClose(actual: number, expected: number, eps = 0.001, msg?: string): void {
  if (Math.abs(actual - expected) > eps) {
    throw new Error(
      `${msg ? msg + ": " : ""}expected ${expected}±${eps}, got ${actual}`,
    );
  }
}

/** Object-property deep equality (arrays compared element-wise). */
export function assertDeep(actual: unknown, expected: unknown, msg?: string): void {
  const a = JSON.stringify(sortKeys(actual));
  const b = JSON.stringify(sortKeys(expected));
  if (a !== b) {
    throw new Error(`${msg ? msg + ": " : ""}\n  expected ${b}\n  got      ${a}`);
  }
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      out[k] = sortKeys((value as Record<string, unknown>)[k]);
    }
    return out;
  }
  return value;
}

void current;

export function summary(): { pass: number; fail: number } {
  return { pass: passCount, fail: failCount };
}