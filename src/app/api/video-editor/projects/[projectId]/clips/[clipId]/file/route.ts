import path from "node:path";
import { loadProject, projectAbsolutePath } from "@/server/video-editor/storage";
import { mimeFor, serveFileWithRange } from "@/server/video-editor/serve";

export const runtime = "nodejs";

/** Stream the proxy mp4 (default) or poster — `?asset=poster` to switch. */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ projectId: string; clipId: string }> },
) {
  const { projectId, clipId } = await ctx.params;
  const url = new URL(req.url);
  const asset = url.searchParams.get("asset") ?? "proxy";

  let project;
  try {
    project = await loadProject(projectId);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const clip = project.clips.find((c) => c.id === clipId);
  if (!clip) return new Response("Clip not found", { status: 404 });

  let rel: string | undefined;
  if (asset === "poster") rel = clip.posterPath;
  else if (asset === "source") rel = clip.sourcePath;
  else if (asset === "audio") rel = clip.audioPath;
  else rel = clip.proxyPath ?? clip.sourcePath;

  if (!rel) return new Response("Asset not ready", { status: 404 });

  const abs = projectAbsolutePath(projectId, rel);
  const ext = path.extname(rel);
  return serveFileWithRange(abs, req.headers.get("range"), mimeFor(ext));
}
