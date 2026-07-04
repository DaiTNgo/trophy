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
  if (/^https?:\/\//i.test(contentUrl) || contentUrl.startsWith("blob:") || contentUrl.startsWith("data:")) {
    return contentUrl;
  }

  return `${BACKEND_URL}${contentUrl.startsWith("/") ? contentUrl : `/${contentUrl}`}`;
}

export async function uploadProductVariantMedia(file: File, widthPx?: number, heightPx?: number): Promise<ProductVariantMedia> {
  const formData = new FormData();
  formData.append("file", file);
  if (widthPx !== undefined) {
    formData.append("widthPx", String(widthPx));
  }
  if (heightPx !== undefined) {
    formData.append("heightPx", String(heightPx));
  }

  const response = await backendFetch(`/api/admin/products/assets`, {
    method: "POST",
    credentials: "include",
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
    credentials: "include",
  });

  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(body?.error || "Unable to delete variant media.");
  }
}
