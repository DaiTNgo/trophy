import type { Context } from "hono";
import { allowedMimeTypes, MAX_ASSET_BYTES } from "./asset-utils";
import type { AppEnv } from "./env";
import { readImageDimensions } from "./image-dimensions";
import { toAbsoluteAssetUrl } from "./url";
import { jsonError } from "./validation";

type UploadBody = {
  buffer: ArrayBuffer;
  previewBuffer?: ArrayBuffer;
  mimeType: string;
  clientWidth?: number;
  clientHeight?: number;
  clientPageCount?: number;
};

export type CustomizationAssetUpload = {
  buffer: ArrayBuffer;
  previewBuffer?: ArrayBuffer;
  mimeType: string;
  dimensions: { width: number; height: number };
  pageCount?: number;
};

/** Reads a raw or multipart customization asset upload and checks its MIME type. */
export async function readCustomizationAssetUpload(c: Context<AppEnv>) {
  const contentType = c.req.header("content-type") ?? "";
  const mimeType = contentType.split(";")[0]?.trim() ?? "";
  const body: UploadBody = { buffer: new ArrayBuffer(0), mimeType };

  if (mimeType === "multipart/form-data") {
    const form = await c.req.parseBody();
    const file = form["file"];
    if (!(file instanceof File)) {
      return { ok: false as const, response: jsonError(c, 400, "File is missing in multipart request") };
    }
    body.buffer = await file.arrayBuffer();
    body.mimeType = file.type;

    const thumbnail = form["thumbnail"];
    if (thumbnail instanceof File) {
      body.previewBuffer = await thumbnail.arrayBuffer();
    }

    const w = form["width"];
    const h = form["height"];
    const p = form["pageCount"];
    if (typeof w === "string" && typeof h === "string") {
      body.clientWidth = Number(w);
      body.clientHeight = Number(h);
    }
    if (typeof p === "string") {
      body.clientPageCount = Number(p);
    }
  } else {
    body.buffer = await c.req.arrayBuffer();
  }

  if (!allowedMimeTypes.has(body.mimeType)) {
    return {
      ok: false as const,
      response: jsonError(c, 415, "Only PNG, JPEG, WEBP, and PDF customization assets are supported"),
    };
  }

  return { ok: true as const, body };
}

/**
 * Checks size and resolves dimensions. PDFs need client-measured dimensions;
 * images are always measured from their bytes.
 */
export function validateCustomizationAssetUpload(c: Context<AppEnv>, body: UploadBody) {
  const { buffer, mimeType, clientWidth, clientHeight, clientPageCount } = body;
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_ASSET_BYTES) {
    return {
      ok: false as const,
      response: jsonError(c, 413, "Customization asset size is invalid or exceeds the 20 MB limit"),
    };
  }

  let dimensions: { width: number; height: number } | null;
  let pageCount: number | undefined;

  if (mimeType === "application/pdf") {
    if (!clientWidth || !clientHeight) {
      return { ok: false as const, response: jsonError(c, 422, "Missing PDF dimensions in upload request") };
    }
    dimensions = { width: clientWidth, height: clientHeight };
    pageCount = clientPageCount;
  } else {
    dimensions = readImageDimensions(mimeType, new Uint8Array(buffer));
  }

  if (!dimensions || dimensions.width < 1 || dimensions.height < 1) {
    return { ok: false as const, response: jsonError(c, 422, "Asset data is invalid or unsupported") };
  }

  const upload: CustomizationAssetUpload = {
    buffer,
    previewBuffer: body.previewBuffer,
    mimeType,
    dimensions,
    pageCount,
  };
  return { ok: true as const, upload };
}

/** PDF sizes are stored in points with a page count; images in pixels. */
export function customizationAssetSizeFields({ mimeType, dimensions, pageCount }: CustomizationAssetUpload) {
  return mimeType === "application/pdf"
    ? { widthPt: dimensions.width, heightPt: dimensions.height, pageCount }
    : { widthPx: dimensions.width, heightPx: dimensions.height };
}

export function originalAssetMetadata(id: string, ownerKey: string, upload: CustomizationAssetUpload) {
  return {
    assetId: id,
    ownerKey,
    widthPx: String(upload.dimensions.width),
    heightPx: String(upload.dimensions.height),
    ...(upload.pageCount ? { pageCount: String(upload.pageCount) } : {}),
  };
}

export function customizationAssetResponse(
  c: Context<AppEnv>,
  id: string,
  upload: CustomizationAssetUpload,
  hasPreview: boolean,
) {
  return {
    asset: {
      id,
      mimeType: upload.mimeType,
      ...customizationAssetSizeFields(upload),
      byteSize: upload.buffer.byteLength,
      contentUrl: toAbsoluteAssetUrl(c, `/api/assets/customizations/${id}/content`) as string,
      ...(hasPreview
        ? { previewUrl: toAbsoluteAssetUrl(c, `/api/assets/customizations/${id}/preview`) as string }
        : {}),
    },
  };
}
