import { NextResponse } from "next/server";
import { ingestUpload } from "@/server/video-editor/ingest";

export const runtime = "nodejs";
export const maxDuration = 300; // seconds — long enough for proxy + transcribe

/**
 * Multipart upload of one or more video files.
 *
 * Form fields:
 *   - file:        binary (one or many)
 *   - takeLabel:   optional string applied to each uploaded file
 *   - languageHint: optional ISO-639-1 (e.g. "en") forwarded to Whisper
 *
 * Processing (probe -> proxy -> transcript) is run inline so the response
 * carries a fully-ready clip.  This keeps the editor self-contained without
 * needing a separate worker process.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await ctx.params;
  const form = await req.formData();
  const files = form.getAll("file");
  if (files.length === 0) {
    return NextResponse.json(
      { ok: false, error: { code: "NO_FILES", message: "No file field present." } },
      { status: 400 },
    );
  }
  const takeLabel = (form.get("takeLabel") as string | null) ?? undefined;
  const languageHint = (form.get("languageHint") as string | null) ?? undefined;

  const results = [];
  for (const f of files) {
    if (!(f instanceof File)) continue;
    const buf = new Uint8Array(await f.arrayBuffer());
    try {
      const clip = await ingestUpload(projectId, f.name, buf, {
        takeLabel: takeLabel || undefined,
        languageHint: languageHint || undefined,
      });
      results.push({ ok: true, clip });
    } catch (e) {
      results.push({ ok: false, error: (e as Error).message, name: f.name });
    }
  }
  return NextResponse.json({ ok: true, data: results });
}
