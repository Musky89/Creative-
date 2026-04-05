import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getPrisma } from "@/server/db/prisma";
import { getVisualAssetStorageRoot } from "@/server/storage/visual-asset-storage";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId")?.trim();
  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const prisma = getPrisma();
  const asset = await prisma.visualAsset.findUnique({ where: { id } });
  if (!asset || asset.clientId !== clientId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (asset.status !== "COMPLETED" || !asset.localPath) {
    return NextResponse.json({ error: "Asset not available" }, { status: 404 });
  }

  const root = getVisualAssetStorageRoot();
  const abs = path.join(root, asset.localPath);
  try {
    const buf = await readFile(abs);
    const meta = asset.metadata as Record<string, unknown> | null;
    const mime =
      (typeof meta?.mimeType === "string" && meta.mimeType) || "image/png";
    return new NextResponse(buf, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
}
