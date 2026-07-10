export const MAX_CLIPART_ASSET_BYTES = 20 * 1024 * 1024;
export const SUPPORTED_CLIPART_MIME_TYPES = new Set(["image/svg+xml", "image/png", "image/webp"]);

export type UploadDraft = {
  file: File;
  name: string;
  mimeType: string;
};

export const clipartNameFromFile = (fileName: string) =>
  fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();

export function formatClipartMimeType(mimeType: string) {
  if (mimeType === "image/svg+xml") return "SVG";
  if (mimeType === "image/webp") return "WebP";
  return "PNG";
}

export function inferClipartMimeType(file: File) {
  const normalizedMimeType = file.type?.trim().toLowerCase();
  if (normalizedMimeType && SUPPORTED_CLIPART_MIME_TYPES.has(normalizedMimeType)) {
    return normalizedMimeType;
  }

  const normalizedFileName = file.name.trim().toLowerCase();
  if (normalizedFileName.endsWith(".svg")) return "image/svg+xml";
  if (normalizedFileName.endsWith(".png")) return "image/png";
  if (normalizedFileName.endsWith(".webp")) return "image/webp";

  return normalizedMimeType ?? "";
}

export function buildUploadDraftErrors(drafts: UploadDraft[]) {
  const duplicateFileNames = new Set<string>();
  const seenFileNames = new Set<string>();

  for (const draft of drafts) {
    const normalized = draft.file.name.trim().toLowerCase();
    if (seenFileNames.has(normalized)) {
      duplicateFileNames.add(normalized);
    } else {
      seenFileNames.add(normalized);
    }
  }

  return drafts.map((draft) => {
    const errors: string[] = [];
    const normalizedName = draft.file.name.trim().toLowerCase();

    if (!draft.name.trim()) {
      errors.push("Name is required.");
    }
    if (duplicateFileNames.has(normalizedName)) {
      errors.push("Duplicate filenames in one batch are not allowed.");
    }
    if (!SUPPORTED_CLIPART_MIME_TYPES.has(draft.mimeType)) {
      errors.push("Only SVG, PNG, and WebP files are supported.");
    }
    if (draft.file.size === 0 || draft.file.size > MAX_CLIPART_ASSET_BYTES) {
      errors.push("File must be smaller than 20 MB.");
    }

    return errors;
  });
}
