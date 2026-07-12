import * as v from "valibot";
import { readImageDimensions } from "./image-dimensions";

export const CLIPART_ASSET_OWNER_KEY = "clipart_asset";
export const clipartMimeTypes = new Set(["image/svg+xml", "image/png", "image/webp"]);

export const clipartIdParamsSchema = v.object({
  id: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(255)),
});

export const clipartCategoryCreateSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(120)),
});

export const clipartCategoryUpdateSchema = v.object({
  name: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(120))),
  active: v.optional(v.boolean()),
  sortOrder: v.optional(v.number()),
});

export const clipartCategoryReorderSchema = v.object({
  categoryIds: v.pipe(v.array(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(255))), v.minLength(1)),
});

export const clipartAssetUpdateSchema = v.object({
  name: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(120))),
  active: v.optional(v.boolean()),
});

export type ClipartBatchValidationError = {
  row: number;
  message: string;
};

export function validateClipartCategoryForLibraryWrites(category: { active: boolean } | null) {
  if (!category) {
    return {
      ok: false as const,
      status: 404 as const,
      error: "Clipart category not found",
    };
  }

  if (!category.active) {
    return {
      ok: false as const,
      status: 409 as const,
      error: "Clipart category is inactive",
    };
  }

  return { ok: true as const };
}

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

export const extensionForClipartMimeType = (mimeType: string) => {
  if (mimeType === "image/svg+xml") return "svg";
  if (mimeType === "image/webp") return "webp";
  return "png";
};

export function inferClipartMimeType({
  mimeType,
  fileName,
}: {
  mimeType?: string | null;
  fileName?: string | null;
}) {
  const normalizedMimeType = mimeType?.trim().toLowerCase();
  if (normalizedMimeType && clipartMimeTypes.has(normalizedMimeType)) {
    return normalizedMimeType;
  }

  const normalizedFileName = fileName?.trim().toLowerCase() ?? "";
  if (normalizedFileName.endsWith(".svg")) return "image/svg+xml";
  if (normalizedFileName.endsWith(".png")) return "image/png";
  if (normalizedFileName.endsWith(".webp")) return "image/webp";

  return normalizedMimeType ?? "application/octet-stream";
}

export const readClipartMetadata = ({
  mimeType,
  bytes,
}: {
  mimeType: string;
  bytes: Uint8Array;
}) => {
  if (!clipartMimeTypes.has(mimeType)) {
    return {
      ok: false as const,
      error: "Only SVG, PNG, and WebP clipart assets are supported.",
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
        error: "SVG clipart assets need width and height or a valid viewBox.",
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
      error: "Clipart asset data is invalid or unsupported.",
      status: 422 as const,
    };
  }

  return {
    ok: true as const,
    metadata: dimensions,
  };
};

export async function prepareClipartBatchUpload({
  files,
  names,
  maxAssetBytes,
}: {
  files: File[];
  names: string[];
  maxAssetBytes: number;
}) {
  if (files.length === 0) {
    return {
      ok: false as const,
      status: 400 as const,
      error: "At least one clipart file is required",
    };
  }

  if (!Array.isArray(names) || names.length !== files.length) {
    return {
      ok: false as const,
      status: 400 as const,
      error: "Clipart asset names must match the uploaded file count",
    };
  }

  const seenFileNames = new Set<string>();
  const rowErrors: ClipartBatchValidationError[] = [];
  const prepared = [];

  for (const [index, file] of files.entries()) {
    const displayName = String(names[index] ?? "").trim();
    const fileName = file.name.trim();
    const row = index + 1;

    if (!displayName) {
      rowErrors.push({ row, message: "Clipart name is required" });
      continue;
    }

    if (!fileName) {
      rowErrors.push({ row, message: "Clipart filename is required" });
      continue;
    }

    if (seenFileNames.has(fileName.toLowerCase())) {
      rowErrors.push({ row, message: "Duplicate files in the same clipart batch are not allowed" });
      continue;
    }
    seenFileNames.add(fileName.toLowerCase());

    const buffer = await file.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > maxAssetBytes) {
      rowErrors.push({ row, message: `Clipart asset ${file.name} is invalid or exceeds the 20 MB limit` });
      continue;
    }

    const mimeType = inferClipartMimeType({
      mimeType: file.type,
      fileName,
    });
    const metadataResult = readClipartMetadata({
      mimeType,
      bytes: new Uint8Array(buffer),
    });
    if (!metadataResult.ok) {
      rowErrors.push({ row, message: metadataResult.error });
      continue;
    }

    prepared.push({
      displayName,
      fileName,
      mimeType,
      buffer,
      metadata: metadataResult.metadata,
    });
  }

  if (rowErrors.length > 0) {
    return {
      ok: false as const,
      status: rowErrors.some((entry) => entry.message.includes("Duplicate files")) ? (409 as const) : (422 as const),
      error: rowErrors[0]?.message ?? "Invalid clipart batch",
      rowErrors,
    };
  }

  return {
    ok: true as const,
    prepared,
  };
}
