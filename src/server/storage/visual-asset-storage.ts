import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_REL_SEGMENT = "visual-assets";

/**
 * Local file storage for generated visuals. Swap for S3/GCS later without touching callers.
 */
export function getVisualAssetStorageRoot(): string {
  const raw = process.env.STORAGE_ROOT?.trim();
  const base = raw ? path.resolve(raw) : path.join(process.cwd(), "storage");
  return path.normalize(base);
}

/**
 * Resolve a stored relative path (e.g. visual-assets/xyz.png) to an absolute path.
 * Rejects path traversal outside the storage root.
 */
export function resolveVisualAssetAbsolutePath(relativePath: string): string {
  const root = getVisualAssetStorageRoot();
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const abs = path.resolve(root, normalized);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (!abs.startsWith(rootWithSep) && abs !== root) {
    throw new Error("Invalid storage path: escapes storage root.");
  }
  return abs;
}

export function visualAssetRelativePath(assetId: string, ext = "png"): string {
  return path.join(DEFAULT_REL_SEGMENT, `${assetId}.${ext}`);
}

export async function saveVisualAssetFile(
  assetId: string,
  buffer: Buffer,
  ext = "png",
): Promise<{ absolutePath: string; relativePath: string }> {
  const root = getVisualAssetStorageRoot();
  const dir = path.join(root, DEFAULT_REL_SEGMENT);
  await mkdir(dir, { recursive: true });
  const filename = `${assetId}.${ext}`;
  const absolutePath = path.join(dir, filename);
  await writeFile(absolutePath, buffer);
  return {
    absolutePath,
    relativePath: path.join(DEFAULT_REL_SEGMENT, filename),
  };
}
