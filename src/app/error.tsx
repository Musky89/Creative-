"use client";

/**
 * Catches uncaught errors in the route segment (including many server render failures)
 * so users see guidance instead of a blank "Internal Server Error" page.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const msg = error.message ?? "";
  const looksDb =
    /database|prisma|postgres|p1001|p2021|p2022|relation|column|DATABASE_URL/i.test(
      msg,
    );

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-red-500/30 bg-red-950/30 px-6 py-8 text-red-100">
      <h1 className="text-lg font-semibold text-red-50">Something went wrong</h1>
      <p className="mt-3 text-sm leading-relaxed text-red-100/85">
        {looksDb ? (
          <>
            This often means PostgreSQL isn&apos;t running,{" "}
            <code className="rounded bg-red-950/50 px-1 font-mono text-xs">DATABASE_URL</code> is
            wrong, or you need{" "}
            <code className="rounded bg-red-950/50 px-1 font-mono text-xs">
              npm run db:migrate:deploy
            </code>
            . See <code className="font-mono text-xs">docs/LOCAL_DEV.md</code>.
          </>
        ) : (
          <>
            Try again. If it keeps happening, check the terminal where{" "}
            <code className="font-mono text-xs">npm run dev</code> is running for the full error.
          </>
        )}
      </p>
      {process.env.NODE_ENV === "development" && msg ? (
        <pre className="mt-4 max-h-40 overflow-auto rounded-lg border border-red-900/50 bg-red-950/50 p-3 text-left text-xs text-red-200/90">
          {msg}
        </pre>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-950 hover:bg-white"
      >
        Try again
      </button>
    </div>
  );
}
