export function shouldLoadMediaViaBlob(src?: string, mimeType?: string) {
  if (!src) return false;
  if (src.startsWith("blob:") || src.startsWith("data:")) return false;

  const normalizedMimeType = mimeType?.trim().toLowerCase();
  if (normalizedMimeType === "image/webp") return true;

  return src.toLowerCase().includes(".webp");
}
