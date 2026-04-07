"use client";

/**
 * Root-level error UI when the root layout fails. `error.tsx` does not run for those cases;
 * without this, Next can respond with a bare "Internal Server Error" body.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#09090b",
          color: "#fafafa",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: "32rem" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ marginTop: "1rem", fontSize: "0.875rem", lineHeight: 1.6, opacity: 0.85 }}>
            The app hit a server error before the normal page shell could render. Check the
            terminal where <code style={{ opacity: 0.9 }}>npm run dev</code> is running for the
            stack trace.
          </p>
          <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", lineHeight: 1.6, opacity: 0.75 }}>
            Common fixes: set <code>DATABASE_URL</code> in <code>.env</code>, start PostgreSQL, run{" "}
            <code>npm run db:migrate:deploy</code>, then restart the dev server.
          </p>
          {process.env.NODE_ENV === "development" && error.message ? (
            <pre
              style={{
                marginTop: "1rem",
                padding: "0.75rem",
                fontSize: "0.75rem",
                overflow: "auto",
                maxHeight: "12rem",
                background: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: "0.5rem",
              }}
            >
              {error.message}
            </pre>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "1.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              borderRadius: "0.5rem",
              border: "none",
              background: "#fafafa",
              color: "#09090b",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
