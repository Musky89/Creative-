import Link from "next/link";
import { loadProject } from "@/server/video-editor/storage";
import { Editor } from "@/components/video-editor/editor";
import { PageHeader } from "@/components/ui/section";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  let project;
  try {
    project = await loadProject(projectId);
  } catch {
    return (
      <>
        <PageHeader title="Project not found" />
        <p className="text-sm text-zinc-400">
          That project doesn&apos;t exist.{" "}
          <Link className="underline" href="/video-editor">
            Back to projects
          </Link>
          .
        </p>
      </>
    );
  }
  return <Editor initialProject={project} />;
}
