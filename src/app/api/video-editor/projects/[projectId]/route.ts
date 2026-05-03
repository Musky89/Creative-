import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteProject,
  loadProject,
  mutateProject,
} from "@/server/video-editor/storage";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await ctx.params;
  try {
    const project = await loadProject(projectId);
    return NextResponse.json({ ok: true, data: project });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: (e as Error).message } },
      { status: 404 },
    );
  }
}

const TimelineSegmentSchema = z.object({
  id: z.string(),
  clipId: z.string(),
  start: z.number().min(0),
  end: z.number().min(0),
  transitionInSec: z.number().min(0).max(5).optional(),
  label: z.string().optional(),
});

const PatchBody = z.object({
  name: z.string().min(1).max(120).optional(),
  notes: z.string().max(4000).optional(),
  timeline: z.array(TimelineSegmentSchema).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "BAD_REQUEST", message: parsed.error.message } },
      { status: 400 },
    );
  }
  const project = await mutateProject(projectId, (p) => {
    if (parsed.data.name) p.name = parsed.data.name;
    if (parsed.data.notes !== undefined) p.notes = parsed.data.notes;
    if (parsed.data.timeline) {
      const valid = parsed.data.timeline.filter((seg) =>
        p.clips.some((c) => c.id === seg.clipId),
      );
      p.timeline = valid;
    }
    return p;
  });
  return NextResponse.json({ ok: true, data: project });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await ctx.params;
  await deleteProject(projectId);
  return NextResponse.json({ ok: true });
}
