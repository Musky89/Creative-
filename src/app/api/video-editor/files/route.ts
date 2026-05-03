import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const MIME_MAP: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get("path");
  if (!filePath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const storageRoot = process.env.STORAGE_ROOT || "./storage";
  const resolvedStorage = path.resolve(storageRoot);
  const resolvedFile = path.resolve(filePath);

  if (!resolvedFile.startsWith(resolvedStorage)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const stats = await stat(resolvedFile);
    const ext = path.extname(resolvedFile).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";

    if (ext === ".mp4" || ext === ".webm" || ext === ".mov") {
      const range = req.headers.get("range");
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
        const chunkSize = end - start + 1;

        const fileBuffer = await readFile(resolvedFile);
        const chunk = fileBuffer.subarray(start, end + 1);

        return new NextResponse(chunk, {
          status: 206,
          headers: {
            "Content-Range": `bytes ${start}-${end}/${stats.size}`,
            "Accept-Ranges": "bytes",
            "Content-Length": String(chunkSize),
            "Content-Type": contentType,
          },
        });
      }
    }

    const buffer = await readFile(resolvedFile);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(stats.size),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
