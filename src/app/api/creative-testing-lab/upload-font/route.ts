import { NextResponse } from "next/server";

const MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED = new Set([
  "font/woff2",
  "font/woff",
  "application/font-woff2",
  "application/font-woff",
  "application/x-font-woff",
  "font/ttf",
  "application/x-font-ttf",
  "application/octet-stream",
]);

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

  const name = file.name.toLowerCase();
  const extOk = name.endsWith(".woff2") || name.endsWith(".woff") || name.endsWith(".ttf");
  const mime = file.type || "application/octet-stream";
  if (!extOk && !ALLOWED.has(mime)) {
    return NextResponse.json(
      { error: "Expected .woff2, .woff, or .ttf font file" },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const mimeOut =
    name.endsWith(".woff2")
      ? "font/woff2"
      : name.endsWith(".woff")
        ? "font/woff"
        : name.endsWith(".ttf")
          ? "font/ttf"
          : mime;
  const dataUrl = `data:${mimeOut};base64,${buf.toString("base64")}`;

  return NextResponse.json({
    name: file.name,
    size: file.size,
    mimeType: mimeOut,
    dataUrl,
  });
}
