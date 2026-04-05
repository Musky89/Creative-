import { Card } from "@/components/ui/section";

/**
 * Shown when Prisma cannot reach PostgreSQL (typical first-run / Docker-not-up case).
 */
export function DatabaseUnavailableNotice() {
  return (
    <Card className="border-amber-300 bg-amber-50/90">
      <h2 className="text-sm font-semibold text-amber-950">
        Database unreachable
      </h2>
      <p className="mt-2 text-sm text-amber-950/90">
        AgenticForce could not connect to PostgreSQL. The app needs a running database
        and a correct <code className="rounded bg-amber-100/80 px-1 font-mono text-xs">DATABASE_URL</code> in{" "}
        <code className="rounded bg-amber-100/80 px-1 font-mono text-xs">.env</code>.
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-amber-950/85">
        <li>
          Start Postgres. Optional: from the repo root run{" "}
          <code className="rounded bg-amber-100/80 px-1 font-mono text-xs">
            docker compose up -d
          </code>{" "}
          (see <code className="font-mono text-xs">docker-compose.yml</code>).
        </li>
        <li>
          Run{" "}
          <code className="rounded bg-amber-100/80 px-1 font-mono text-xs">
            npm run db:migrate:deploy
          </code>
          .
        </li>
        <li>
          Run{" "}
          <code className="rounded bg-amber-100/80 px-1 font-mono text-xs">
            npm run preflight
          </code>{" "}
          to verify env, DB, and storage.
        </li>
      </ol>
      <p className="mt-3 text-xs text-amber-900/80">
        Step-by-step: open <code className="font-mono">docs/LOCAL_DEV.md</code> in this repository.
      </p>
    </Card>
  );
}
