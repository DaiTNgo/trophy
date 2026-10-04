import { getNativeMediaDimensions } from "./image-dimensions";
import { convertPdfToImageFile } from "./pdf-preview";

export type MediaDimensions = { widthPx: number; heightPx: number };

export const MAX_METADATA_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB
export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
export const ACCEPT_IMAGE_MIME_TYPES = "image/png,image/jpeg,image/webp";
export const SUPPORTED_IMAGE_TYPES_HINT = "PNG, JPG, WEBP up to 20MB";

export function validateCategoryOrCollectionMediaFile(file: File): string | null {
  const mimeType = file.type.trim();
  if (mimeType && !ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    return "Unsupported file type. Only PNG, JPG, and WEBP files are supported.";
  }
  if (!mimeType) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["png", "jpg", "jpeg", "webp"].includes(ext)) {
      return "Unsupported file type. Only PNG, JPG, and WEBP files are supported.";
    }
  }
  if (file.size <= 0) {
    return "File is empty.";
  }
  if (file.size > MAX_METADATA_IMAGE_BYTES) {
    return "File exceeds the 20 MB limit.";
  }
  return null;
}

export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf";
}

/** Returns a raster image for PDFs (rendered first page), otherwise the file itself. */
export async function toPreviewImageFile(file: File): Promise<File> {
  return isPdfFile(file) ? convertPdfToImageFile(file) : file;
}

/**
 * Reads native dimensions of the original file and, for PDFs, renders a preview image.
 * Throws when dimensions cannot be read: unknown dimensions are never staged.
 */
export async function readMediaAsset(file: File): Promise<{
  previewFile: File | undefined;
  dimensions: MediaDimensions;
}> {
  const dimensions = await getNativeMediaDimensions(file).catch(() => {
    throw new Error("Failed to load media dimensions.");
  });
  const previewFile = isPdfFile(file) ? await convertPdfToImageFile(file) : undefined;
  return { previewFile, dimensions };
}

export function dimensionsMatch(
  actual: MediaDimensions | null | undefined,
  expected: { widthPx: number | null; heightPx: number | null },
): boolean {
  return (
    !!actual &&
    actual.widthPx === expected.widthPx &&
    actual.heightPx === expected.heightPx
  );
}
