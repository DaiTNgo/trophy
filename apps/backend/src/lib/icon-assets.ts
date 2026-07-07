import * as v from "valibot";
import { readImageDimensions } from "./image-dimensions";

export const ICON_ASSET_OWNER_KEY = "brand_icon_asset";
export const iconMimeTypes = new Set(["image/svg+xml", "image/png", "image/webp"]);

export const iconAssetParamsSchema = v.object({
  id: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(255)),
});

export const iconAssetUpdateSchema = v.object({
  name: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(120))),
  categoryId: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(120)))),
  categoryLabel: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(120)))),
  tags: v.optional(v.array(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(60)))),
});

const unsafeSvgPatterns = [
  /<script[\s>]/i,
  /\son\w+\s*=/i,
  /(?:href|xlink:href)\s*=\s*["'](?:https?:|data:|javascript:)/i,
  /<foreignObject[\s>]/i,
];

const parseSvgDimensions = (markup: string) => {
  const widthMatch = markup.match(/\bwidth\s*=\s*["']\s*([0-9.]+)(?:px)?\s*["']/i);
  const heightMatch = markup.match(/\bheight\s*=\s*["']\s*([0-9.]+)(?:px)?\s*["']/i);
  const viewBoxMatch = markup.match(/\bviewBox\s*=\s*["']\s*[-0-9.]+\s+[-0-9.]+\s+([0-9.]+)\s+([0-9.]+)\s*["']/i);

  const width = widthMatch ? Number(widthMatch[1]) : viewBoxMatch ? Number(viewBoxMatch[1]) : null;
  const height = heightMatch ? Number(heightMatch[1]) : viewBoxMatch ? Number(viewBoxMatch[2]) : null;

  if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
};

export const extensionForIconMimeType = (mimeType: string) => {
  if (mimeType === "image/svg+xml") return "svg";
  if (mimeType === "image/webp") return "webp";
  return "png";
};

export const parseTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
};

export const readIconMetadata = ({
  mimeType,
  bytes,
}: {
  mimeType: string;
  bytes: Uint8Array;
}) => {
  if (!iconMimeTypes.has(mimeType)) {
    return {
      ok: false as const,
      error: "Only SVG, PNG, and WebP icon assets are supported.",
      status: 415 as const,
    };
  }

  if (mimeType === "image/svg+xml") {
    const markup = new TextDecoder().decode(bytes);
    if (!markup.includes("<svg")) {
      return {
        ok: false as const,
        error: "SVG asset data is invalid.",
        status: 422 as const,
      };
    }

    if (unsafeSvgPatterns.some((pattern) => pattern.test(markup))) {
      return {
        ok: false as const,
        error: "SVG assets must not contain scripts, external references, or event handlers.",
        status: 422 as const,
      };
    }

    const dimensions = parseSvgDimensions(markup);
    if (!dimensions) {
      return {
        ok: false as const,
        error: "SVG icons need width and height or a valid viewBox.",
        status: 422 as const,
      };
    }

    return {
      ok: true as const,
      metadata: dimensions,
    };
  }

  const dimensions = readImageDimensions(mimeType, bytes);
  if (!dimensions) {
    return {
      ok: false as const,
      error: "Icon asset data is invalid or unsupported.",
      status: 422 as const,
    };
  }

  return {
    ok: true as const,
    metadata: dimensions,
  };
};
