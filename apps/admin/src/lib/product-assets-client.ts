import type { ProductVariantMedia } from "../types";

const backendBaseUrl =
  (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8787";

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

function normalizeContentUrl(contentUrl: string) {
  if (/^https?:\/\//i.test(contentUrl)) {
    return contentUrl;
  }

  return `${backendBaseUrl}${contentUrl.startsWith("/") ? contentUrl : `/${contentUrl}`}`;
}

export async function uploadProductVariantMedia(file: File): Promise<ProductVariantMedia> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${backendBaseUrl}/api/products/assets`, {
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
  const response = await fetch(`${backendBaseUrl}/api/products/assets/${assetId}`, {
    method: "DELETE",
    credentials: "include",
  });

  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(body?.error || "Unable to delete variant media.");
  }
}
