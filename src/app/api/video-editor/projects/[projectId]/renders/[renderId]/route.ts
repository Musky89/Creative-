import { loadProject, projectAbsolutePath } from "@/server/video-editor/storage";
import { mimeFor, serveFileWithRange } from "@/server/video-editor/serve";
import path from "node:path";

export const runtime = "nodejs";

/** Stream / download a rendered MP4. `?download=1` to force attachment. */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ projectId: string; renderId: string }> },
) {
  const { projectId, renderId } = await ctx.params;
  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";
  let project;
  try {
    project = await loadProject(projectId);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const render = project.renders.find((r) => r.id === renderId);
  if (!render) return new Response("Render not found", { status: 404 });
  const abs = projectAbsolutePath(projectId, render.path);
  const resp = await serveFileWithRange(
    abs,
    req.headers.get("range"),
    mimeFor(path.extname(render.path)),
  );
  if (download) {
    const headers = new Headers(resp.headers);
    const filename = `${slug(project.name)}-${renderId}.mp4`;
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    return new Response(resp.body, { status: resp.status, headers });
  }
  return resp;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "render";
}
