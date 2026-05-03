import { NextResponse } from "next/server";
import { z } from "zod";
import { renderProject } from "@/server/video-editor/render";
import { mutateProject } from "@/server/video-editor/storage";

export const runtime = "nodejs";
export const maxDuration = 600;

const RenderBody = z
  .object({
    targetHeight: z.union([z.literal(1080), z.literal(720), z.literal(480)]).optional(),
    fps: z.number().int().min(12).max(120).optional(),
    crf: z.number().int().min(14).max(32).optional(),
    audioBitrate: z.string().regex(/^\d{2,4}k$/).optional(),
    defaultCrossfadeSec: z.number().min(0).max(2).optional(),
  })
  .optional();

export async function POST(
  req: Request,
  ctx: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await ctx.params;
  const body = await req.json().catch(() => undefined);
  const parsed = RenderBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "BAD_REQUEST", message: parsed.error.message } },
      { status: 400 },
    );
  }
  const settings = parsed.data ?? {};

  const projectAtStart = await mutateProject(projectId, (p) => {
    p.status = "rendering";
    return p;
  });

  try {
    const { render } = await renderProject(projectAtStart, settings);
    const updated = await mutateProject(projectId, (p) => {
      p.renders.push(render);
      p.status = "rendered";
      return p;
    });
    return NextResponse.json({ ok: true, data: { render, project: updated } });
  } catch (e) {
    await mutateProject(projectId, (p) => {
      p.status = "ready";
      return p;
    });
    return NextResponse.json(
      { ok: false, error: { code: "RENDER_FAILED", message: (e as Error).message } },
      { status: 500 },
    );
  }
}
