import { NextResponse } from "next/server";
import { z } from "zod";
import { reanalyseClip } from "@/server/video-editor/ingest";
import { mutateProject } from "@/server/video-editor/storage";

export const runtime = "nodejs";

const PatchBody = z.object({
  takeLabel: z.string().max(60).optional(),
  name: z.string().max(120).optional(),
  extraFillers: z.array(z.string().min(1).max(30)).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ projectId: string; clipId: string }> },
) {
  const { projectId, clipId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "BAD_REQUEST", message: parsed.error.message } },
      { status: 400 },
    );
  }
  if (parsed.data.extraFillers && parsed.data.extraFillers.length > 0) {
    await reanalyseClip(
      projectId,
      clipId,
      new Set(parsed.data.extraFillers.map((s) => s.toLowerCase())),
    );
  }
  const project = await mutateProject(projectId, (p) => {
    const c = p.clips.find((x) => x.id === clipId);
    if (!c) return p;
    if (parsed.data.takeLabel !== undefined) c.takeLabel = parsed.data.takeLabel;
    if (parsed.data.name !== undefined) c.name = parsed.data.name;
    return p;
  });
  return NextResponse.json({ ok: true, data: project });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ projectId: string; clipId: string }> },
) {
  const { projectId, clipId } = await ctx.params;
  const project = await mutateProject(projectId, (p) => {
    p.clips = p.clips.filter((c) => c.id !== clipId);
    p.timeline = p.timeline.filter((s) => s.clipId !== clipId);
    return p;
  });
  return NextResponse.json({ ok: true, data: project });
}
