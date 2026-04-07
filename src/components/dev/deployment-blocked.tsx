import { Card } from "@/components/ui/section";

/**
 * Shown when Prisma cannot reach PostgreSQL (typical first-run / Docker-not-up case).
 */
export function DatabaseUnavailableNotice() {
  return (
    <Card className="border-amber-500/35 bg-amber-500/10">
      <h2 className="text-sm font-semibold text-amber-100">
        Database unreachable
      </h2>
      <p className="mt-2 text-sm text-amber-100/85">
        The app could not load data from PostgreSQL — either the database is unreachable,{" "}
        <code className="rounded bg-amber-950/40 px-1 font-mono text-xs text-amber-50">DATABASE_URL</code> in{" "}
        <code className="rounded bg-amber-950/40 px-1 font-mono text-xs text-amber-50">.env</code> is wrong, or{" "}
        <strong className="font-medium text-amber-50">migrations are behind</strong> (common after{" "}
        <code className="font-mono text-xs text-amber-50/90">git pull</code>).
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-amber-100/80">
        <li>
          Start Postgres. Optional: from the repo root run{" "}
          <code className="rounded bg-amber-950/40 px-1 font-mono text-xs text-amber-50">
            docker compose up -d
          </code>{" "}
          (see <code className="font-mono text-xs text-amber-50/90">docker-compose.yml</code>).
        </li>
        <li>
          Run{" "}
          <code className="rounded bg-amber-950/40 px-1 font-mono text-xs text-amber-50">
            npm run db:migrate:deploy
          </code>
          .
        </li>
        <li>
          Run{" "}
          <code className="rounded bg-amber-950/40 px-1 font-mono text-xs text-amber-50">
            npm run preflight
          </code>{" "}
          to verify env, DB, and storage.
        </li>
      </ol>
      <p className="mt-3 text-xs text-amber-200/70">
        Step-by-step: open <code className="font-mono text-amber-50/90">docs/LOCAL_DEV.md</code> in this repository.
      </p>
    </Card>
  );
}
