import * as v from "valibot";

export const MAX_ASSET_BYTES = 20 * 1024 * 1024;
export const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);

export const assetParamsSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
});

export const cleanOwnerKey = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 120);

export const extensionForMimeType = (mimeType: string) => {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "application/pdf") return "pdf";
  return "jpg";
};
