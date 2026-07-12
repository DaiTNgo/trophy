import type { ProductVariantMedia } from "../types";

import { backendFetch, BACKEND_URL } from "./fetch";

type ProductAssetResponse = {
  asset?: {
    id: string;
    fileName: string;
    mimeType: string;
    widthPx: number;
    heightPx: number;
    byteSize: number;
    contentUrl: string;
  };
  error?: string;
};

export function normalizeContentUrl(contentUrl: string) {
  if (contentUrl.startsWith("blob:") || contentUrl.startsWith("data:")) {
    return contentUrl;
  }
  if (contentUrl.startsWith("/")) {
    return `${BACKEND_URL}${contentUrl}`;
  }
  return contentUrl;
}

import { getImageDimensions } from "./image-dimensions";

export async function uploadProductVariantMedia(file: File, widthPx?: number, heightPx?: number): Promise<ProductVariantMedia> {
  let finalWidthPx = widthPx;
  let finalHeightPx = heightPx;

  if (finalWidthPx === undefined || finalHeightPx === undefined) {
    try {
      if (file.type.startsWith("image/")) {
        const dimensions = await getImageDimensions(file);
        finalWidthPx = dimensions.width;
        finalHeightPx = dimensions.height;
      }
    } catch (e) {
      console.warn("Could not read image dimensions before upload", e);
    }
  }

  const formData = new FormData();
  formData.append("file", file);
  if (finalWidthPx !== undefined) {
    formData.append("widthPx", String(finalWidthPx));
  }
  if (finalHeightPx !== undefined) {
    formData.append("heightPx", String(finalHeightPx));
  }

  const response = await backendFetch(`/api/admin/products/assets`, {
    method: "POST",

    body: formData,
  });

  const body = (await response.json().catch(() => null)) as ProductAssetResponse | null;
  if (!response.ok || !body?.asset) {
    throw new Error(body?.error || "Unable to upload variant media.");
  }

  return {
    ...body.asset,
    contentUrl: normalizeContentUrl(body.asset.contentUrl),
  };
}

export async function deleteProductVariantMedia(assetId: string) {
  const response = await backendFetch(`/api/admin/products/assets/${assetId}/delete`, {
    method: "POST",

  });

  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(body?.error || "Unable to delete variant media.");
  }
}
