import * as v from "valibot";

export const MAX_ASSET_BYTES = 20 * 1024 * 1024;
export const allowedMimeTypes = new Set(["image/png", "image/jpeg"]);

export const assetParamsSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
});

export const cleanOwnerKey = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 120);

export const extensionForMimeType = (mimeType: string) => (mimeType === "image/png" ? "png" : "jpg");
