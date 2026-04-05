import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Local file storage for generated visuals. Swap for S3/GCS later without touching callers.
 * Files live under STORAGE_ROOT/visual-assets/{assetId}.png by default.
 */
export function getVisualAssetStorageRoot(): string {
  const root = process.env.STORAGE_ROOT?.trim();
  if (root) return path.resolve(root);
  return path.join(process.cwd(), "storage", "visual-assets");
}

export function visualAssetRelativePath(assetId: string, ext = "png"): string {
  return path.join("visual-assets", `${assetId}.${ext}`);
}

export async function saveVisualAssetFile(
  assetId: string,
  buffer: Buffer,
  ext = "png",
): Promise<{ absolutePath: string; relativePath: string }> {
  const root = getVisualAssetStorageRoot();
  const dir = path.join(root, "visual-assets");
  await mkdir(dir, { recursive: true });
  const filename = `${assetId}.${ext}`;
  const absolutePath = path.join(dir, filename);
  await writeFile(absolutePath, buffer);
  return {
    absolutePath,
    relativePath: path.join("visual-assets", filename),
  };
}
