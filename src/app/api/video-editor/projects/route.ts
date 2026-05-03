import { NextResponse } from "next/server";
import { z } from "zod";
import { createProject, listProjects } from "@/server/video-editor/storage";

export const runtime = "nodejs";

export async function GET() {
  const projects = await listProjects();
  return NextResponse.json({
    ok: true,
    data: projects.map((p) => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      status: p.status,
      clipCount: p.clips.length,
      timelineCount: p.timeline.length,
      latestRender: p.renders[p.renders.length - 1] ?? null,
    })),
  });
}

const CreateBody = z.object({ name: z.string().min(1).max(120) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "BAD_REQUEST", message: parsed.error.message } },
      { status: 400 },
    );
  }
  const project = await createProject(parsed.data.name);
  return NextResponse.json({ ok: true, data: project });
}
