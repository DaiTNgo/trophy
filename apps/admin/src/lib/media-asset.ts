import { getNativeMediaDimensions } from "./image-dimensions";
import { convertPdfToImageFile } from "./pdf-preview";

export type MediaDimensions = { widthPx: number; heightPx: number };

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
