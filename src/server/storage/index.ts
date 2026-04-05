/**
 * Central export for persisted blobs (visual assets today; object storage later).
 * Import from here instead of deep paths.
 */
export {
  getVisualAssetStorageRoot,
  resolveVisualAssetAbsolutePath,
  saveVisualAssetFile,
  visualAssetRelativePath,
} from "./visual-asset-storage";
