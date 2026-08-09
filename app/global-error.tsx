"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: "global",
          message: error.message || "unknown",
          digest: error.digest,
        }),
      }).catch(() => {});
    } catch {
      // best-effort only
    }
  }, [error]);

  return (
    <html>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background: "#f7f8fa",
          color: "#16181d",
        }}
      >
        <main style={{ textAlign: "center", padding: "2rem" }}>
          <p style={{ fontWeight: 700, fontSize: "1.25rem" }}>
            Something went wrong
          </p>
          <p style={{ color: "#667085", margin: "0.5rem 0 1.25rem" }}>
            Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              border: 0,
              cursor: "pointer",
              borderRadius: 9999,
              padding: "0.6rem 1.25rem",
              background: "#3f5238",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}