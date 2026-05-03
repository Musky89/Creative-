import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { Readable } from "node:stream";

const MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".wav": "audio/wav",
};

export function mimeFor(ext: string): string {
  return MIME[ext.toLowerCase()] || "application/octet-stream";
}

/**
 * Serve a file with HTTP Range support. Required for video scrubbing in
 * Chromium/Safari. Returns a `Response` suitable for App Router handlers.
 */
export async function serveFileWithRange(
  absPath: string,
  rangeHeader: string | null,
  contentType: string,
): Promise<Response> {
  let st;
  try {
    st = await stat(absPath);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const total = st.size;

  if (!rangeHeader) {
    const stream = createReadStream(absPath);
    return new Response(toWebStream(stream), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(total),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=0",
      },
    });
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) {
    return new Response("Invalid range", {
      status: 416,
      headers: { "Content-Range": `bytes */${total}` },
    });
  }
  const startStr = match[1];
  const endStr = match[2];
  let start: number;
  let end: number;
  if (startStr === "" && endStr !== "") {
    const suffix = parseInt(endStr, 10);
    start = Math.max(0, total - suffix);
    end = total - 1;
  } else {
    start = parseInt(startStr, 10);
    end = endStr === "" ? total - 1 : Math.min(parseInt(endStr, 10), total - 1);
  }
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= total) {
    return new Response("Invalid range", {
      status: 416,
      headers: { "Content-Range": `bytes */${total}` },
    });
  }
  const chunkSize = end - start + 1;
  const stream = createReadStream(absPath, { start, end });
  return new Response(toWebStream(stream), {
    status: 206,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(chunkSize),
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=0",
    },
  });
}

function toWebStream(stream: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      stream.on("data", (chunk: Buffer | string) => {
        const u8 =
          typeof chunk === "string"
            ? new TextEncoder().encode(chunk)
            : new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        controller.enqueue(u8);
      });
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });
}
