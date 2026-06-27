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
import { getEmbeddedFont } from "./pdf-fonts";
import { drawStraightText } from "./pdf-text-straight";

// ─── image loading ────────────────────────────────────────────────────────────

const parseDataUrl = (value: string) => {
  const match = /^data:(image\/(?:png|jpeg|svg\+xml));(?:charset=[^,]+,|base64,)?(.+)$/s.exec(value);
  if (!match) return null;
  const mimeType = match[1]!;
  if (mimeType === "image/svg+xml") return null;
  return {
    mimeType,
    bytes: Uint8Array.from(atob(match[2]!), (c) => c.charCodeAt(0)),
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
  if (mimeType !== "image/png" && mimeType !== "image/jpeg") return null;
  return { mimeType, bytes: new Uint8Array(await response.arrayBuffer()) };
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

  // Stable key for per-document font cache (use document's internal id)
  const docKey = design.id;

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
      const image = source.mimeType === "image/png"
        ? await pdf.embedPng(source.bytes)
        : await pdf.embedJpg(source.bytes);
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

      const image = source.mimeType === "image/png"
        ? await pdf.embedPng(source.bytes)
        : await pdf.embedJpg(source.bytes);

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
      page.drawImage(image, { x: imgX, y: imgY, width: imgRect.widthPx, height: imgRect.heightPx });
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
        const embeddedFont = await getEmbeddedFont(pdf, layer.fontId, docKey);
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

        const embeddedFont = await getEmbeddedFont(pdf, layer.fontId, docKey);
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
