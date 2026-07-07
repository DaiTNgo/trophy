/**
 * Vector PDF export for customization designs.
 *
 * Architecture:
 *   - Background: PDF embed (pendingPdfFile) or raster image (template.background.previewUrl)
 *   - Image shape layers: raster image embedded with vector clip path
 *   - Text layers (straight): pdf-lib native drawText() — true vector glyphs, font embedded
 *   - Text layers (path):     glyph-on-path engine (opentype.js) — vector glyphs per character
 *
 * Note (future): If CMYK color space is required for print production,
 * this client-side approach must be replaced with server-side rendering
 * (Ghostscript, Cairo, or a dedicated PDF engine) since pdf-lib only supports RGB.
 */

import {
  PDFDocument,
  pushGraphicsState,
  popGraphicsState,
  clip,
  moveTo,
  lineTo,
  appendBezierCurve,
  closePath,
  endPath,
  concatTransformationMatrix,
  degrees,
  rgb,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { layerGeometryToPixels } from "@trophy/customization";
import type { CustomizationDesign, CustomizationTemplate, VectorPath } from "@trophy/customization";
import { loadFontBytes } from "./pdf-fonts";
import { drawStraightText } from "./pdf-text-straight";

// ─── image loading ────────────────────────────────────────────────────────────

const parseDataUrl = (value: string) => {
  const match = /^data:(image\/(?:png|jpeg|svg\+xml));(?:charset=[^,]+,|base64,)?(.+)$/s.exec(value);
  if (!match) return null;
  const mimeType = match[1]!;
  const payload = match[2]!;
  const isBase64 = value.includes(";base64,");
  return {
    mimeType,
    bytes: isBase64
      ? Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
      : new TextEncoder().encode(decodeURIComponent(payload)),
  };
};

const readImageBytes = async (url: string | File) => {
  if (url instanceof File) {
    return { mimeType: url.type, bytes: new Uint8Array(await url.arrayBuffer()) };
  }
  const dataUrl = parseDataUrl(url);
  if (dataUrl) return dataUrl;
  const response = await fetch(url).catch(() => null);
  if (!response?.ok) return null;
  const mimeType = response.headers.get("content-type")?.split(";")[0] ?? "";
  if (
    mimeType !== "image/png" &&
    mimeType !== "image/jpeg" &&
    mimeType !== "image/webp" &&
    mimeType !== "image/svg+xml"
  ) return null;
  return { mimeType, bytes: new Uint8Array(await response.arrayBuffer()) };
};

const embedRasterizedImage = async ({
  pdf,
  source,
  widthPx,
  heightPx,
}: {
  pdf: PDFDocument;
  source: { mimeType: string; bytes: Uint8Array };
  widthPx: number;
  heightPx: number;
}) => {
  const blob = new Blob([source.bytes.slice().buffer], { type: source.mimeType });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Failed to rasterize export image"));
      element.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(widthPx || image.naturalWidth || 1));
    canvas.height = Math.max(1, Math.round(heightPx || image.naturalHeight || 1));
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to create export rasterization canvas");
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pngSource = parseDataUrl(canvas.toDataURL("image/png"));
    if (!pngSource) {
      throw new Error("Failed to encode rasterized export image");
    }

    return pdf.embedPng(pngSource.bytes);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const embedPdfImage = async ({
  pdf,
  source,
  widthPx,
  heightPx,
}: {
  pdf: PDFDocument;
  source: { mimeType: string; bytes: Uint8Array };
  widthPx: number;
  heightPx: number;
}) => {
  if (source.mimeType === "image/png") {
    return pdf.embedPng(source.bytes);
  }

  if (source.mimeType === "image/jpeg") {
    return pdf.embedJpg(source.bytes);
  }

  return embedRasterizedImage({ pdf, source, widthPx, heightPx });
};

type ParsedSvgVectorShape = {
  path: string;
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
  opacity: number;
  fillOpacity: number;
  strokeOpacity: number;
};

type ParsedSvgVectorDocument = {
  minX: number;
  minY: number;
  width: number;
  height: number;
  shapes: ParsedSvgVectorShape[];
};

type SvgInheritedStyle = {
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
  opacity: number;
  fillOpacity: number;
  strokeOpacity: number;
  visible: boolean;
};

const defaultSvgStyle: SvgInheritedStyle = {
  fill: "#000000",
  stroke: null,
  strokeWidth: 1,
  opacity: 1,
  fillOpacity: 1,
  strokeOpacity: 1,
  visible: true,
};

const svgLength = (value: string | null) => {
  if (!value) return null;
  const match = value.trim().match(/^(-?\d*\.?\d+)(?:px)?$/i);
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isFinite(number) ? number : null;
};

const svgPointsToPath = (points: string, close: boolean) => {
  const values = points
    .trim()
    .split(/[\s,]+/)
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry));

  if (values.length < 4 || values.length % 2 !== 0) {
    return null;
  }

  const pairs: Array<[number, number]> = [];
  for (let index = 0; index < values.length; index += 2) {
    pairs.push([values[index]!, values[index + 1]!]);
  }

  return `${pairs.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ")}${close ? " Z" : ""}`;
};

const ellipsePath = ({
  cx,
  cy,
  rx,
  ry,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}) =>
  `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;

const rectPath = ({
  x,
  y,
  width,
  height,
  rx,
  ry,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
  ry: number;
}) => {
  if (rx <= 0 && ry <= 0) {
    return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
  }

  const safeRx = Math.min(rx || ry, width / 2);
  const safeRy = Math.min(ry || rx, height / 2);
  return [
    `M ${x + safeRx} ${y}`,
    `L ${x + width - safeRx} ${y}`,
    `A ${safeRx} ${safeRy} 0 0 1 ${x + width} ${y + safeRy}`,
    `L ${x + width} ${y + height - safeRy}`,
    `A ${safeRx} ${safeRy} 0 0 1 ${x + width - safeRx} ${y + height}`,
    `L ${x + safeRx} ${y + height}`,
    `A ${safeRx} ${safeRy} 0 0 1 ${x} ${y + height - safeRy}`,
    `L ${x} ${y + safeRy}`,
    `A ${safeRx} ${safeRy} 0 0 1 ${x + safeRx} ${y}`,
    "Z",
  ].join(" ");
};

const parseSvgStyleAttribute = (value: string | null) => {
  if (!value) return new Map<string, string>();
  const entries = value
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [key, rawValue] = entry.split(":");
      return [key?.trim() ?? "", rawValue?.trim() ?? ""] as const;
    })
    .filter(([key, rawValue]) => key && rawValue);
  return new Map(entries);
};

const parseSvgNumberAttribute = (
  element: Element,
  key: string,
  styleMap: Map<string, string>,
  fallback: number,
) => {
  const attrValue = element.getAttribute(key) ?? styleMap.get(key) ?? null;
  if (attrValue === null) return fallback;
  const number = Number(attrValue);
  return Number.isFinite(number) ? number : fallback;
};

const mergeSvgStyle = (element: Element, inherited: SvgInheritedStyle): SvgInheritedStyle | null => {
  if (element.getAttribute("transform")?.trim()) {
    return null;
  }

  const styleMap = parseSvgStyleAttribute(element.getAttribute("style"));
  const visibility = element.getAttribute("visibility") ?? styleMap.get("visibility");
  const display = element.getAttribute("display") ?? styleMap.get("display");
  const visible =
    inherited.visible &&
    visibility !== "hidden" &&
    visibility !== "collapse" &&
    display !== "none";

  return {
    fill: element.getAttribute("fill") ?? styleMap.get("fill") ?? inherited.fill,
    stroke: element.getAttribute("stroke") ?? styleMap.get("stroke") ?? inherited.stroke,
    strokeWidth: parseSvgNumberAttribute(element, "stroke-width", styleMap, inherited.strokeWidth),
    opacity: parseSvgNumberAttribute(element, "opacity", styleMap, inherited.opacity),
    fillOpacity: parseSvgNumberAttribute(element, "fill-opacity", styleMap, inherited.fillOpacity),
    strokeOpacity: parseSvgNumberAttribute(element, "stroke-opacity", styleMap, inherited.strokeOpacity),
    visible,
  };
};

const elementToSvgPath = (element: Element) => {
  const tagName = element.tagName.toLowerCase();

  if (tagName === "path") {
    return element.getAttribute("d")?.trim() || null;
  }

  if (tagName === "rect") {
    const x = svgLength(element.getAttribute("x")) ?? 0;
    const y = svgLength(element.getAttribute("y")) ?? 0;
    const width = svgLength(element.getAttribute("width"));
    const height = svgLength(element.getAttribute("height"));
    if (!width || !height) return null;
    const rx = svgLength(element.getAttribute("rx")) ?? 0;
    const ry = svgLength(element.getAttribute("ry")) ?? 0;
    return rectPath({ x, y, width, height, rx, ry });
  }

  if (tagName === "circle") {
    const cx = svgLength(element.getAttribute("cx")) ?? 0;
    const cy = svgLength(element.getAttribute("cy")) ?? 0;
    const r = svgLength(element.getAttribute("r"));
    if (!r) return null;
    return ellipsePath({ cx, cy, rx: r, ry: r });
  }

  if (tagName === "ellipse") {
    const cx = svgLength(element.getAttribute("cx")) ?? 0;
    const cy = svgLength(element.getAttribute("cy")) ?? 0;
    const rx = svgLength(element.getAttribute("rx"));
    const ry = svgLength(element.getAttribute("ry"));
    if (!rx || !ry) return null;
    return ellipsePath({ cx, cy, rx, ry });
  }

  if (tagName === "line") {
    const x1 = svgLength(element.getAttribute("x1"));
    const y1 = svgLength(element.getAttribute("y1"));
    const x2 = svgLength(element.getAttribute("x2"));
    const y2 = svgLength(element.getAttribute("y2"));
    if ([x1, y1, x2, y2].some((value) => value === null)) return null;
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  if (tagName === "polygon") {
    const points = element.getAttribute("points");
    return points ? svgPointsToPath(points, true) : null;
  }

  if (tagName === "polyline") {
    const points = element.getAttribute("points");
    return points ? svgPointsToPath(points, false) : null;
  }

  return null;
};

const svgColorContext = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.getContext("2d");
};

const resolveSvgColor = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "none" || trimmed === "transparent") {
    return null;
  }

  const context = svgColorContext();
  if (!context) return null;

  const previous = context.fillStyle;
  try {
    context.fillStyle = "#000000";
    context.fillStyle = trimmed;
    const normalized = String(context.fillStyle).trim();
    if (normalized === "#000000" && trimmed.toLowerCase() !== "#000000" && trimmed.toLowerCase() !== "black" && !trimmed.startsWith("rgb")) {
      return null;
    }

    const hexMatch = normalized.match(/^#([0-9a-f]{6})$/i);
    if (hexMatch) {
      const hex = hexMatch[1]!;
      return rgb(
        parseInt(hex.slice(0, 2), 16) / 255,
        parseInt(hex.slice(2, 4), 16) / 255,
        parseInt(hex.slice(4, 6), 16) / 255,
      );
    }

    const rgbMatch = normalized.match(/^rgba?\(([^)]+)\)$/i);
    if (rgbMatch) {
      const components = rgbMatch[1]!.split(",").map((entry) => Number(entry.trim()));
      if (components.length >= 3 && components.slice(0, 3).every((entry) => Number.isFinite(entry))) {
        return rgb(components[0]! / 255, components[1]! / 255, components[2]! / 255);
      }
    }

    return null;
  } finally {
    context.fillStyle = previous;
  }
};

const parseSvgVectorDocument = (bytes: Uint8Array): ParsedSvgVectorDocument | null => {
  if (typeof DOMParser === "undefined") {
    return null;
  }

  const markup = new TextDecoder().decode(bytes);
  const documentNode = new DOMParser().parseFromString(markup, "image/svg+xml");
  const parseError = documentNode.querySelector("parsererror");
  const root = documentNode.documentElement;
  if (parseError || !root || root.tagName.toLowerCase() !== "svg") {
    return null;
  }

  const viewBoxParts = root
    .getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry)) ?? [];

  const width = svgLength(root.getAttribute("width"));
  const height = svgLength(root.getAttribute("height"));
  const minX = viewBoxParts.length === 4 ? viewBoxParts[0]! : 0;
  const minY = viewBoxParts.length === 4 ? viewBoxParts[1]! : 0;
  const viewWidth = viewBoxParts.length === 4 ? viewBoxParts[2]! : width;
  const viewHeight = viewBoxParts.length === 4 ? viewBoxParts[3]! : height;

  if (!viewWidth || !viewHeight) {
    return null;
  }

  const shapes: ParsedSvgVectorShape[] = [];
  const ignoredTags = new Set(["defs", "desc", "metadata", "title"]);
  const containerTags = new Set(["svg", "g"]);
  const shapeTags = new Set(["path", "rect", "circle", "ellipse", "line", "polygon", "polyline"]);

  const visit = (element: Element, inherited: SvgInheritedStyle): boolean => {
    const tagName = element.tagName.toLowerCase();
    if (ignoredTags.has(tagName)) {
      return true;
    }

    const style = mergeSvgStyle(element, inherited);
    if (!style) {
      return false;
    }

    if (!style.visible) {
      return true;
    }

    if (containerTags.has(tagName)) {
      return Array.from(element.children).every((child) => visit(child, style));
    }

    if (!shapeTags.has(tagName)) {
      return false;
    }

    const path = elementToSvgPath(element);
    if (!path) {
      return false;
    }

    if ((element.getAttribute("fill-rule") ?? "").trim() === "evenodd") {
      return false;
    }

    shapes.push({
      path,
      fill: style.fill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity,
      fillOpacity: style.fillOpacity,
      strokeOpacity: style.strokeOpacity,
    });
    return true;
  };

  const ok = visit(root, defaultSvgStyle);
  if (!ok || shapes.length === 0) {
    return null;
  }

  return {
    minX,
    minY,
    width: viewWidth,
    height: viewHeight,
    shapes,
  };
};

const drawSvgVectorImage = ({
  page,
  source,
  imgX,
  imgY,
  imgWidth,
  imgHeight,
}: {
  page: ReturnType<PDFDocument["addPage"]>;
  source: { mimeType: string; bytes: Uint8Array };
  imgX: number;
  imgY: number;
  imgWidth: number;
  imgHeight: number;
}) => {
  if (source.mimeType !== "image/svg+xml") {
    return false;
  }

  const parsed = parseSvgVectorDocument(source.bytes);
  if (!parsed) {
    return false;
  }

  const scaleX = imgWidth / parsed.width;
  const scaleY = imgHeight / parsed.height;
  if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY) || Math.abs(scaleX - scaleY) > 0.0001) {
    return false;
  }

  const scale = scaleX;
  const x = imgX - parsed.minX * scale;
  const y = imgY + imgHeight + parsed.minY * scale;

  for (const shape of parsed.shapes) {
    const fill = resolveSvgColor(shape.fill);
    const stroke = resolveSvgColor(shape.stroke);
    if (!fill && !stroke) {
      continue;
    }

    page.drawSvgPath(shape.path, {
      x,
      y,
      scale,
      color: fill ?? undefined,
      opacity: Math.max(0, Math.min(1, shape.opacity * shape.fillOpacity)),
      borderColor: stroke ?? undefined,
      borderOpacity: Math.max(0, Math.min(1, shape.opacity * shape.strokeOpacity)),
      borderWidth: stroke ? Math.max(0, shape.strokeWidth) : 0,
    });
  }

  return true;
};

// ─── image crop math — mirrors getFreeImageRect in customization-template-preview.tsx ─

function freeImageScale(value?: number) {
  return Math.max(0.02, Number.isFinite(value) ? value! : 1);
}

function freeCropOffset(value?: number) {
  return Number.isFinite(value) ? value! : 0;
}

const hexToRgb = (hex: string) => {
  const c = hex.replace("#", "");
  return [
    parseInt(c.substring(0, 2), 16),
    parseInt(c.substring(2, 4), 16),
    parseInt(c.substring(4, 6), 16),
  ];
};

/**
 * Returns image position & size relative to the frame (top-left = 0,0).
 * Matches `getFreeImageRect` in the preview component exactly.
 */
function getFreeImageRect({
  sourceWidthPx,
  sourceHeightPx,
  frameWidthPx,
  frameHeightPx,
  cropScale,
  cropXRatio,
  cropYRatio,
}: {
  sourceWidthPx: number;
  sourceHeightPx: number;
  frameWidthPx: number;
  frameHeightPx: number;
  cropScale?: number;
  cropXRatio?: number;
  cropYRatio?: number;
}) {
  const safeSourceW = Math.max(1, sourceWidthPx);
  const safeSourceH = Math.max(1, sourceHeightPx);
  const safeFrameW  = Math.max(1, frameWidthPx);
  const safeFrameH  = Math.max(1, frameHeightPx);
  const baseCoverScale = Math.max(safeFrameW / safeSourceW, safeFrameH / safeSourceH);
  const scale  = freeImageScale(cropScale);
  const widthPx  = safeSourceW * baseCoverScale * scale;
  const heightPx = safeSourceH * baseCoverScale * scale;
  const centerXPx = safeFrameW / 2 + freeCropOffset(cropXRatio) * safeFrameW;
  const centerYPx = safeFrameH / 2 + freeCropOffset(cropYRatio) * safeFrameH;
  return {
    xPx: centerXPx - widthPx  / 2,
    yPx: centerYPx - heightPx / 2,
    widthPx,
    heightPx,
  };
}

// ─── clipping path operators ───────────────────────────────────────────────────
// (x, y) = bottom-left of frame in PDF bottom-up coordinates.

function addClipShapeOperators(
  page: ReturnType<PDFDocument["addPage"]>,
  shape: string,
  x: number,
  y: number,
  width: number,
  height: number,
  vectorPath?: VectorPath
) {
  if (shape === "circle" || shape === "ellipse") {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rx = width / 2;
    const ry = shape === "ellipse" ? height * 0.4 : height / 2;
    const k = 0.5522848;
    page.pushOperators(moveTo(cx + rx, cy));
    page.pushOperators(appendBezierCurve(cx + rx, cy + ry * k, cx + rx * k, cy + ry, cx, cy + ry));
    page.pushOperators(appendBezierCurve(cx - rx * k, cy + ry, cx - rx, cy + ry * k, cx - rx, cy));
    page.pushOperators(appendBezierCurve(cx - rx, cy - ry * k, cx - rx * k, cy - ry, cx, cy - ry));
    page.pushOperators(appendBezierCurve(cx + rx * k, cy - ry, cx + rx, cy - ry * k, cx + rx, cy));
    page.pushOperators(closePath());
  } else if (shape === "rounded_rectangle") {
    const radius = Math.min(width, height) * 0.12;
    const k = 0.5522848;
    const o = radius * k;
    page.pushOperators(moveTo(x + radius, y));
    page.pushOperators(lineTo(x + width - radius, y));
    page.pushOperators(appendBezierCurve(x + width - radius + o, y, x + width, y + radius - o, x + width, y + radius));
    page.pushOperators(lineTo(x + width, y + height - radius));
    page.pushOperators(appendBezierCurve(x + width, y + height - radius + o, x + width - radius + o, y + height, x + width - radius, y + height));
    page.pushOperators(lineTo(x + radius, y + height));
    page.pushOperators(appendBezierCurve(x + radius - o, y + height, x, y + height - radius + o, x, y + height - radius));
    page.pushOperators(lineTo(x, y + radius));
    page.pushOperators(appendBezierCurve(x, y + radius - o, x + radius - o, y, x + radius, y));
    page.pushOperators(closePath());
  } else if (shape === "star") {
    // Polygon matching: 50.00% 0.00%, 62.93% 32.20%, 97.55% 34.55%, 70.92% 56.80%, 79.39% 90.45%, 50.00% 72.00%, 20.61% 90.45%, 29.08% 56.80%, 2.45% 34.55%, 37.07% 32.20%
    const pts = [
      [0.5, 0], [0.6293, 0.322], [0.9755, 0.3455], [0.7092, 0.568], [0.7939, 0.9045],
      [0.5, 0.72], [0.2061, 0.9045], [0.2908, 0.568], [0.0245, 0.3455], [0.3707, 0.322]
    ];
    for (let i = 0; i < pts.length; i++) {
      const px = x + pts[i]![0] * width;
      const py = y + (1 - pts[i]![1]) * height; // bottom-up
      if (i === 0) page.pushOperators(moveTo(px, py));
      else         page.pushOperators(lineTo(px, py));
    }
    page.pushOperators(closePath());
  } else if (shape === "heart") {
    const tx = (rx: number) => x + rx * width;
    const ty = (ry: number) => y + (1 - ry) * height;
    page.pushOperators(moveTo(tx(0.5), ty(0.85)));
    page.pushOperators(appendBezierCurve(tx(0.1), ty(0.55), tx(0),   ty(0.25), tx(0.25), ty(0.12)));
    page.pushOperators(appendBezierCurve(tx(0.4), ty(0),    tx(0.5), ty(0.16), tx(0.5),  ty(0.28)));
    page.pushOperators(appendBezierCurve(tx(0.5), ty(0.16), tx(0.6), ty(0),    tx(0.75), ty(0.12)));
    page.pushOperators(appendBezierCurve(tx(1),   ty(0.25), tx(0.9), ty(0.55), tx(0.5),  ty(0.85)));
    page.pushOperators(closePath());
  } else if (shape === "vector" && vectorPath && vectorPath.points.length > 0) {
    for (let i = 0; i < vectorPath.points.length; i++) {
      const pt  = vectorPath.points[i]!;
      const px  = x + pt.xRatio * width;
      const py  = y + (1 - pt.yRatio) * height;
      if (i === 0) {
        page.pushOperators(moveTo(px, py));
      } else {
        const prev = vectorPath.points[i - 1]!;
        const ppx  = x + prev.xRatio * width;
        const ppy  = y + (1 - prev.yRatio) * height;
        const c1x  = ppx + (prev.outHandle?.xRatio ?? 0) * width;
        const c1y  = ppy - (prev.outHandle?.yRatio ?? 0) * height;
        const c2x  = px  + (pt.inHandle?.xRatio ?? 0) * width;
        const c2y  = py  - (pt.inHandle?.yRatio ?? 0) * height;
        page.pushOperators(appendBezierCurve(c1x, c1y, c2x, c2y, px, py));
      }
    }
    if (vectorPath.closed) page.pushOperators(closePath());
  } else {
    // rectangle (default)
    page.pushOperators(moveTo(x, y));
    page.pushOperators(lineTo(x + width, y));
    page.pushOperators(lineTo(x + width, y + height));
    page.pushOperators(lineTo(x, y + height));
    page.pushOperators(closePath());
  }
}

// ─── main export function ──────────────────────────────────────────────────────

export const exportVectorPdfClientSide = async (
  template: CustomizationTemplate,
  design: CustomizationDesign,
  pendingPdfFile: File | null
) => {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const embeddedFontCache = new Map<string, any>();

  const getEmbeddedFont = async (fontId: string) => {
    if (embeddedFontCache.has(fontId)) return embeddedFontCache.get(fontId);
    const bytes = await loadFontBytes(fontId);
    if (!bytes) return null;
    const embedded = await pdf.embedFont(bytes);
    embeddedFontCache.set(fontId, embedded);
    return embedded;
  };

  const designWidth  = template.background?.widthPx  ?? 900;
  const designHeight = template.background?.heightPx ?? 900;

  // ── background ──────────────────────────────────────────────────────────────
  let page = pdf.addPage([designWidth, designHeight]);

  if (pendingPdfFile) {
    const bgBytes = await pendingPdfFile.arrayBuffer();
    const bgPdf   = await PDFDocument.load(bgBytes, { ignoreEncryption: true });
    const [embeddedPage] = await pdf.embedPages([bgPdf.getPages()[0]!]);
    pdf.removePage(0);
    page = pdf.addPage([designWidth, designHeight]);
    page.drawPage(embeddedPage, { x: 0, y: 0, width: designWidth, height: designHeight });
  } else if (template.background?.previewUrl) {
    const source = await readImageBytes(template.background.previewUrl);
    if (source) {
      const image = await embedPdfImage({
        pdf,
        source,
        widthPx: designWidth,
        heightPx: designHeight,
      });
      page.drawImage(image, { x: 0, y: 0, width: designWidth, height: designHeight });
    }
  }

  const pageHeight = designHeight;
  const background = { widthPx: designWidth, heightPx: designHeight };
  const layers = [...design.layers].sort((a, b) => a.zIndex - b.zIndex);

  // ── layers ───────────────────────────────────────────────────────────────────
  for (const layer of layers) {

    // ── image_shape ────────────────────────────────────────────────────────────
    if (layer.type === "image_shape") {
      const source = await readImageBytes(layer.previewUrl);
      if (!source) continue;

      const rect    = layerGeometryToPixels({ geometry: layer.geometry, background });
      const frameW  = rect.widthPx;
      const frameH  = rect.heightPx;
      const frameCx = rect.centerXPx;
      const frameCy = pageHeight - rect.centerYPx; // PDF bottom-up
      const frameX  = frameCx - frameW / 2;
      const frameY  = frameCy - frameH / 2;

      const imgRect = getFreeImageRect({
        sourceWidthPx: layer.sourceWidthPx,
        sourceHeightPx: layer.sourceHeightPx,
        frameWidthPx: frameW,
        frameHeightPx: frameH,
        cropScale: layer.cropScale,
        cropXRatio: layer.cropXRatio,
        cropYRatio: layer.cropYRatio,
      });

      const imgX = (frameCx - frameW / 2) + imgRect.xPx;
      const imgY = (frameCy + frameH / 2) - imgRect.yPx - imgRect.heightPx;

      const rotDeg = layer.geometry.rotationDeg;
      page.pushOperators(pushGraphicsState());

      if (rotDeg !== 0) {
        const rad  = (-rotDeg * Math.PI) / 180;
        const cosR = Math.cos(rad);
        const sinR = Math.sin(rad);
        page.pushOperators(concatTransformationMatrix(
          cosR, sinR, -sinR, cosR,
          frameCx * (1 - cosR) + frameCy * sinR,
          frameCy * (1 - cosR) - frameCx * sinR
        ));
      }

      addClipShapeOperators(page, layer.shape.type, frameX, frameY, frameW, frameH, layer.shape.vectorPath);
      page.pushOperators(clip());
      page.pushOperators(endPath());

      const drewVectorSvg = drawSvgVectorImage({
        page,
        source,
        imgX,
        imgY,
        imgWidth: imgRect.widthPx,
        imgHeight: imgRect.heightPx,
      });

      if (!drewVectorSvg) {
        const image = await embedPdfImage({
          pdf,
          source,
          widthPx: layer.sourceWidthPx,
          heightPx: layer.sourceHeightPx,
        });
        page.drawImage(image, { x: imgX, y: imgY, width: imgRect.widthPx, height: imgRect.heightPx });
      }

      page.pushOperators(popGraphicsState());
      continue;
    }

    // ── text ───────────────────────────────────────────────────────────────────
    if (layer.type === "text") {
      if (!layer.text.trim()) continue;

      const rect   = layerGeometryToPixels({ geometry: layer.geometry, background });
      const frameW = rect.widthPx;

      const textLineH  = layer.fontSizePt * 1.35;
      const closedPath = layer.path.type === "closed_ellipse";
      const frameH = closedPath
        ? Math.max(1, (layer.geometry.heightRatio ?? layer.geometry.widthRatio) * designHeight)
        : textLineH * Math.max(1, layer.text.split("\n").length);

      const frameCx = rect.centerXPx;
      const frameCy = pageHeight - rect.centerYPx; // PDF bottom-up center

      // For rendering, frame top-left in PDF coords:
      const frameX    = frameCx - frameW / 2;
      const frameTopY = frameCy + frameH / 2; // top edge in PDF (bottom-up) = center + half height

      const rotDeg = layer.geometry.rotationDeg;
      if (rotDeg !== 0) {
        page.pushOperators(pushGraphicsState());
        const rad  = (-rotDeg * Math.PI) / 180;
        const cosR = Math.cos(rad);
        const sinR = Math.sin(rad);
        page.pushOperators(concatTransformationMatrix(
          cosR, sinR, -sinR, cosR,
          frameCx * (1 - cosR) + frameCy * sinR,
          frameCy * (1 - cosR) - frameCx * sinR
        ));
      }

      if (layer.path.type === "straight") {
        // ── straight text: pdf-lib native (true vector) ──────────────────────
        const embeddedFont = await getEmbeddedFont(layer.fontId);
        if (!embeddedFont) {
          if (rotDeg !== 0) page.pushOperators(popGraphicsState());
          continue;
        }
        drawStraightText({
          page,
          embeddedFont,
          text: layer.text,
          fontSizePt: layer.fontSizePt,
          color: layer.color,
          align: layer.align,
          isUnderline: layer.isUnderline,
          frameX,
          frameTopY,
          frameW,
        });
      } else {
        // ── path text: DOM Coordinate Extraction (Perfect UI Sync) ────────────
        const textPathEl = document.getElementById(`export-textpath-${layer.id}`) as any;
        if (!textPathEl || typeof textPathEl.getNumberOfChars !== "function") {
          console.warn(`[PDF Export] Could not find SVGTextPathElement for layer ${layer.id}`);
          if (rotDeg !== 0) page.pushOperators(popGraphicsState());
          continue;
        }

        const embeddedFont = await getEmbeddedFont(layer.fontId);
        if (!embeddedFont) {
          if (rotDeg !== 0) page.pushOperators(popGraphicsState());
          continue;
        }

        const [r, g, b] = hexToRgb(layer.color);
        const rgbColor = rgb(r / 255, g / 255, b / 255);

        const charCount = textPathEl.getNumberOfChars();
        // Fallback to layer.text if textContent is somehow empty
        const textContent = textPathEl.textContent || layer.text;

        let charIndex = 0;
        let domIndex = 0;

        while (domIndex < charCount && charIndex < textContent.length) {
          const charCode = textContent.charCodeAt(charIndex);
          const isSurrogate = charCode >= 0xD800 && charCode <= 0xDBFF;
          const charStr = isSurrogate ? textContent.substring(charIndex, charIndex + 2) : textContent[charIndex];

          try {
            if (charStr && charStr.trim() !== "") {
              const startPt = textPathEl.getStartPositionOfChar(domIndex);
              const rot = textPathEl.getRotationOfChar(domIndex);

              const px = frameX + startPt.x;
              const py = frameTopY - startPt.y;

              page.drawText(charStr, {
                x: px,
                y: py,
                font: embeddedFont,
                size: layer.fontSizePt,
                color: rgbColor,
                rotate: degrees(-rot), // SVG positive is clockwise, PDF positive is counter-clockwise
              });
            }
          } catch (err) {
            // getStartPositionOfChar throws if the character is out of the path length
          }

          charIndex += isSurrogate ? 2 : 1;
          domIndex++; // getNumberOfChars counts rendered characters (surrogate pairs are usually 1 rendered char, but we iterate index by index just in case)
        }
      }

      if (rotDeg !== 0) page.pushOperators(popGraphicsState());
    }
  }

  pdf.setTitle(`Customization export ${design.id}`);
  const bytes = await pdf.save();
  return new Blob([bytes as any], { type: "application/pdf" });
};
