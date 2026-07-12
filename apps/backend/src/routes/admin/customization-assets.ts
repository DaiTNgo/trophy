import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/client";
import { customizationAssets } from "../../db/schema";
import {
  allowedMimeTypes,
  assetParamsSchema,
  cleanOwnerKey,
  extensionForMimeType,
  MAX_ASSET_BYTES,
} from "../../lib/asset-utils";
import type { AppEnv } from "../../lib/env";
import { readImageDimensions } from "../../lib/image-dimensions";
import { toAbsoluteAssetUrl } from "../../lib/url";
import { jsonError, parseParams } from "../../lib/validation";

export const customizationAssetsRoute = new Hono<AppEnv>()
  .post("/", async (c) => {
    const contentType = c.req.header("content-type") ?? "";
    let mimeType = contentType.split(";")[0]?.trim();
    const isMultipart = mimeType === "multipart/form-data";

    let buffer: ArrayBuffer;
    let previewBuffer: ArrayBuffer | undefined;
    let pdfWidth: number | undefined;
    let pdfHeight: number | undefined;
    let pdfPageCount: number | undefined;

    if (isMultipart) {
      const body = await c.req.parseBody();
      const file = body["file"];
      if (!(file instanceof File)) {
        return jsonError(c, 400, "File is missing in multipart request");
      }
      buffer = await file.arrayBuffer();
      mimeType = file.type;

      const thumbnail = body["thumbnail"];
      if (thumbnail instanceof File) {
        previewBuffer = await thumbnail.arrayBuffer();
      }

      const w = body["width"];
      const h = body["height"];
      const p = body["pageCount"];
      if (typeof w === "string" && typeof h === "string") {
        pdfWidth = Number(w);
        pdfHeight = Number(h);
      }
      if (typeof p === "string") {
        pdfPageCount = Number(p);
      }
    } else {
      buffer = await c.req.arrayBuffer();
    }

    if (!allowedMimeTypes.has(mimeType)) {
      return jsonError(c, 415, "Only PNG, JPEG, and PDF customization assets are supported");
    }

    const ownerKey = cleanOwnerKey(c.req.header("x-upload-token") ?? "");
    if (!ownerKey) {
      return jsonError(c, 401, "X-Upload-Token is required");
    }

    if (buffer.byteLength === 0 || buffer.byteLength > MAX_ASSET_BYTES) {
      return jsonError(c, 413, "Customization asset size is invalid or exceeds the 20 MB limit");
    }

    const bytes = new Uint8Array(buffer);
    let dimensions: { width: number; height: number } | null = null;
    let pageCount: number | undefined;

    if (pdfWidth && pdfHeight) {
      dimensions = { width: pdfWidth, height: pdfHeight };
      pageCount = pdfPageCount;
    } else if (mimeType === "application/pdf") {
      return jsonError(c, 422, "Missing PDF dimensions in upload request");
    } else {
      dimensions = readImageDimensions(mimeType, bytes);
    }

    if (!dimensions || dimensions.width < 1 || dimensions.height < 1) {
      return jsonError(c, 422, "Asset data is invalid or unsupported");
    }

    const id = crypto.randomUUID();
    const objectKey = `uploads/${ownerKey}/${id}/original.${extensionForMimeType(mimeType)}`;
    let previewObjectKey: string | undefined;

    await c.env.CUSTOMIZATION_ASSETS.put(objectKey, buffer, {
      httpMetadata: { contentType: mimeType },
      customMetadata: {
        assetId: id,
        ownerKey,
        widthPx: String(dimensions.width),
        heightPx: String(dimensions.height),
        ...(pageCount ? { pageCount: String(pageCount) } : {}),
      },
    });

    if (previewBuffer) {
      previewObjectKey = `uploads/${ownerKey}/${id}/preview.webp`;
      await c.env.CUSTOMIZATION_ASSETS.put(previewObjectKey, previewBuffer, {
        httpMetadata: { contentType: "image/webp" },
        customMetadata: {
          assetId: id,
          ownerKey,
          type: "preview",
        },
      });
    }

    await getDb(c.env).insert(customizationAssets).values({
      id,
      ownerKey,
      objectKey,
      previewObjectKey,
      mimeType,
      ...(mimeType === "application/pdf"
        ? { widthPt: dimensions.width, heightPt: dimensions.height, pageCount }
        : { widthPx: dimensions.width, heightPx: dimensions.height }),
      byteSize: buffer.byteLength,
    });

    return c.json(
      {
        asset: {
          id,
          mimeType,
          ...(mimeType === "application/pdf"
            ? { widthPt: dimensions.width, heightPt: dimensions.height, pageCount }
            : { widthPx: dimensions.width, heightPx: dimensions.height }),
          byteSize: buffer.byteLength,
          contentUrl: toAbsoluteAssetUrl(c, `/api/assets/customizations/${id}/content`) as string,
          ...(previewObjectKey
            ? { previewUrl: toAbsoluteAssetUrl(c, `/api/assets/customizations/${id}/preview`) as string }
            : {}),
        },
      },
      201,
    );
  });
