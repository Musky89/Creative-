import { NextResponse } from "next/server";

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB per file (lab only)

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 413 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "application/octet-stream";
  const base64 = buf.toString("base64");
  const dataUrl = `data:${mime};base64,${base64}`;

  return NextResponse.json({
    name: file.name,
    size: file.size,
    mimeType: mime,
    dataUrl,
  });
}
