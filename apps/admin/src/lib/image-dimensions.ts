import { getPdfDimensions } from "./pdf-preview";

export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      reject(new Error("Failed to load image dimensions"));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export async function getNativeMediaDimensions(file: File): Promise<{ widthPx: number; heightPx: number }> {
  if (file.type === "application/pdf") {
    return getPdfDimensions(file);
  }
  const dims = await getImageDimensions(file);
  return { widthPx: dims.width, heightPx: dims.height };
}
