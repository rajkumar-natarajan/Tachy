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
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#060d1c",
          color: "#e2e8f0",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 460, padding: 24 }}>
          <div
            style={{
              fontSize: 40,
              marginBottom: 12,
              filter: "drop-shadow(0 0 12px rgba(0,240,255,0.4))",
            }}
          >
            ⚡
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 13, color: "#8291aa", margin: "0 0 20px" }}>
            Tachy hit an unexpected error. Try reloading — your collections and
            history are saved locally.
          </p>
          <button
            onClick={() => reset()}
            style={{
              cursor: "pointer",
              border: "none",
              borderRadius: 10,
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 600,
              color: "#060d1c",
              background: "#00F0FF",
              boxShadow: "0 0 20px rgba(0,240,255,0.25)",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
