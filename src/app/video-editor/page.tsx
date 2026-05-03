import Link from "next/link";
import { listProjects } from "@/server/video-editor/storage";
import { PageHeader, Card, EmptyState } from "@/components/ui/section";
import { NewProjectButton } from "@/components/video-editor/new-project-button";

export const dynamic = "force-dynamic";

export default async function VideoEditorIndex() {
  const projects = await listProjects();
  return (
    <>
      <PageHeader
        title="Video editor"
        description="Upload multiple takes, remove fillers and silences with a click, and render the final cut."
        action={<NewProjectButton />}
      />
      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create a project, drop your two takes in, and the editor will transcribe and pre-clean them."
          action={<NewProjectButton />}
        />
      ) : (
        <div className="grid gap-3">
          {projects.map((p) => {
            const latest = p.renders[p.renders.length - 1];
            return (
              <Link
                key={p.id}
                href={`/video-editor/${p.id}`}
                className="block"
              >
                <Card className="transition-colors hover:border-zinc-700 hover:bg-zinc-900/70">
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{p.name}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {p.clips.length} clip
                        {p.clips.length === 1 ? "" : "s"} · {p.timeline.length} segment
                        {p.timeline.length === 1 ? "" : "s"} ·{" "}
                        {latest ? `last render ${formatRelative(latest.createdAt)}` : "no render yet"}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-500">
                      Updated {formatRelative(p.updatedAt)}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
