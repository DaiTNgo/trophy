/**
 * Vector PDF export for customization designs.
 *
 * Architecture:
 *   - Background: PDF embed (pendingPdfFile) or raster image (template.background.previewUrl)
 *   - Image shape layers: raster image embedded with vector clip path
 *   - Text layers (straight): pdf-lib native drawText() — true vector glyphs, font embedded
 *   - Text layers (path):     SVG textPath rasterized to canvas at 4× then embedded as PNG
 *
 * Note (future): If CMYK color space is required for print production,
 * this client-side approach must be replaced with server-side rendering
 * (Ghostscript, Cairo, or a dedicated PDF engine) since pdf-lib only supports RGB.
 */

import {
  PDFDocument,
  pushGraphicsState,
  popGraphicsState,
  concatTransformationMatrix,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { layerGeometryToPixels, getTextPathRenderAttributes, getTextPathSvgD } from "@trophy/customization";
import type { CustomizationDesign, CustomizationTemplate } from "@trophy/customization";
import { loadFontBytes } from "./pdf-fonts";
import { drawStraightText } from "./pdf-text-straight";
import { backendFetch } from "./fetch";

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

const fetchAssetResponse = async (inputUrl: string) => {
  return backendFetch(inputUrl, { cache: "reload" }).catch(() => null);
};

const readImageBytes = async (url: string | File) => {
  if (url instanceof File) {
    return { mimeType: url.type, bytes: new Uint8Array(await url.arrayBuffer()) };
  }
  const dataUrl = parseDataUrl(url);
  if (dataUrl) return dataUrl;
  const response = await fetchAssetResponse(url);
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

    // Clear default white fill so transparent images stay transparent when embedded
    context.clearRect(0, 0, canvas.width, canvas.height);
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

  const designWidth = template.background?.widthPx ?? 900;
  const designHeight = template.background?.heightPx ?? 900;

  // ── background ──────────────────────────────────────────────────────────────
  let page = pdf.addPage([designWidth, designHeight]);

  if (pendingPdfFile) {
    const bgBytes = await pendingPdfFile.arrayBuffer();
    const bgPdf = await PDFDocument.load(bgBytes, { ignoreEncryption: true });
    if (bgPdf.getPageCount() > 0) {
      const [embeddedPage] = await pdf.embedPages([bgPdf.getPages()[0]!]);
      pdf.removePage(0);
      page = pdf.addPage([designWidth, designHeight]);
      page.drawPage(embeddedPage, { x: 0, y: 0, width: designWidth, height: designHeight });
    }
  } else if (template.background?.previewUrl) {
    const isPdfBg =
      template.background.mimeType === "application/pdf" ||
      template.background.previewUrl.toLowerCase().endsWith(".pdf") ||
      template.background.contentUrl?.toLowerCase().endsWith(".pdf");

    if (isPdfBg) {
      const pdfUrl =
        template.background.contentUrl
          ? template.background.contentUrl
          : template.background.pdfAssetId
            ? (template.background.pdfAssetId.startsWith("/")
              ? template.background.pdfAssetId
              : `/api/assets/products/${template.background.pdfAssetId}/export`)
            : template.background.previewUrl;
      const response = await fetchAssetResponse(pdfUrl);
      let pdfEmbedded = false;
      if (response?.ok) {
        try {
          const bgBytes = await response.arrayBuffer();
          const bgPdf = await PDFDocument.load(bgBytes, { ignoreEncryption: true });
          if (bgPdf.getPageCount() > 0) {
            const [embeddedPage] = await pdf.embedPages([bgPdf.getPages()[0]!]);
            pdf.removePage(0);
            page = pdf.addPage([designWidth, designHeight]);
            page.drawPage(embeddedPage, { x: 0, y: 0, width: designWidth, height: designHeight });
            pdfEmbedded = true;
          }
        } catch {
          pdfEmbedded = false;
        }
      }
      if (!pdfEmbedded) {
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
    } else {
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
  }

  const pageHeight = designHeight;
  const background = { widthPx: designWidth, heightPx: designHeight };
  const layers = [...design.layers].sort((a, b) => a.zIndex - b.zIndex);

  // ── layers ───────────────────────────────────────────────────────────────────
  for (const layer of layers) {

    // ── image_shape ────────────────────────────────────────────────────────────
    if (layer.type === "image_shape") {
      // not ready yet
      // @TODO
      continue;
      // const source = await readImageBytes(layer.previewUrl);
      // if (!source) continue;

      // const rect = layerGeometryToPixels({ geometry: layer.geometry, background });
      // const frameW = rect.widthPx;
      // const frameH = rect.heightPx;
      // const frameCx = rect.centerXPx;
      // const frameCy = pageHeight - rect.centerYPx; // PDF bottom-up
      // const frameX = frameCx - frameW / 2;
      // const frameY = frameCy - frameH / 2;

      // const sourceLayer = template.layers.find((l) => l.id === layer.layerId);
      // const fit = sourceLayer?.type === "image_shape" ? sourceLayer.upload.fit : "cover";

      // const imgRect = getFreeImageRect({
      //   sourceWidthPx: layer.sourceWidthPx,
      //   sourceHeightPx: layer.sourceHeightPx,
      //   frameWidthPx: frameW,
      //   frameHeightPx: frameH,
      //   cropScale: layer.cropScale,
      //   cropXRatio: layer.cropXRatio,
      //   cropYRatio: layer.cropYRatio,
      // });

      // const imgX = (frameCx - frameW / 2) + imgRect.xPx;
      // const imgY = (frameCy + frameH / 2) - imgRect.yPx - imgRect.heightPx;

      // const rotDeg = layer.geometry.rotationDeg;
      // page.pushOperators(pushGraphicsState());

      // if (rotDeg !== 0) {
      //   const rad = (-rotDeg * Math.PI) / 180;
      //   const cosR = Math.cos(rad);
      //   const sinR = Math.sin(rad);
      //   page.pushOperators(concatTransformationMatrix(
      //     cosR, sinR, -sinR, cosR,
      //     frameCx * (1 - cosR) + frameCy * sinR,
      //     frameCy * (1 - cosR) - frameCx * sinR
      //   ));
      // }

      // addClipShapeOperators(page, layer.shape.type, frameX, frameY, frameW, frameH, layer.shape.vectorPath);
      // page.pushOperators(clip());
      // page.pushOperators(endPath());

      // const drewVectorSvg = drawSvgVectorImage({
      //   page,
      //   source,
      //   imgX,
      //   imgY,
      //   imgWidth: imgRect.widthPx,
      //   imgHeight: imgRect.heightPx,
      // });

      // if (!drewVectorSvg) {
      //   const image = await embedPdfImage({
      //     pdf,
      //     source,
      //     widthPx: layer.sourceWidthPx,
      //     heightPx: layer.sourceHeightPx,
      //   });
      //   page.drawImage(image, { x: imgX, y: imgY, width: imgRect.widthPx, height: imgRect.heightPx });
      // }

      // page.pushOperators(popGraphicsState());
      // continue;
    }

    // ── text ───────────────────────────────────────────────────────────────────
    if (layer.type === "text") {
      if (!layer.text.trim()) continue;

      const rect = layerGeometryToPixels({ geometry: layer.geometry, background });
      const frameW = rect.widthPx;

      const textLineH = layer.fontSizePt * 1.35;
      const closedPath = layer.path.type === "closed_ellipse";
      const frameH = closedPath
        ? Math.max(1, (layer.geometry.heightRatio ?? layer.geometry.widthRatio) * designHeight)
        : textLineH * Math.max(1, layer.text.split("\n").length);

      const frameCx = rect.centerXPx;
      const frameCy = pageHeight - rect.centerYPx; // PDF bottom-up center

      // For rendering, frame top-left in PDF coords:
      const frameX = frameCx - frameW / 2;
      const frameTopY = frameCy + frameH / 2; // top edge in PDF (bottom-up) = center + half height

      const rotDeg = layer.geometry.rotationDeg;
      const flipH = layer.flipHorizontal;
      const flipV = layer.flipVertical;
      const hasTransform = rotDeg !== 0 || Boolean(flipH || flipV);

      if (hasTransform) {
        page.pushOperators(pushGraphicsState());
        const rad = (-rotDeg * Math.PI) / 180;
        const cosR = Math.cos(rad);
        const sinR = Math.sin(rad);
        const sx = flipH ? -1 : 1;
        const sy = flipV ? -1 : 1;
        const a = sx * cosR;
        const b = sx * sinR;
        const c = -sy * sinR;
        const d = sy * cosR;
        const e = frameCx - (a * frameCx + c * frameCy);
        const f = frameCy - (b * frameCx + d * frameCy);
        page.pushOperators(concatTransformationMatrix(a, b, c, d, e, f));
      }

      if (layer.path.type === "straight") {
        // ── straight text: pdf-lib native (true vector) ──────────────────────
        const embeddedFont = await getEmbeddedFont(layer.fontId);
        if (!embeddedFont) {
          if (hasTransform) page.pushOperators(popGraphicsState());
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
        // ── path text: SVG rasterize + embed as image ──────────────────────
        // Build an inline SVG with the textPath, rasterize it via canvas,
        // and embed the resulting PNG into the PDF.  This avoids the fragile
        // dependency on DOM element IDs from the React preview component.
        const textWidth = layer.text.length * layer.fontSizePt * 0.55;
        const wordCount = layer.text.trim() ? layer.text.trim().split(/\s+/).length : 0;
        const pathAttrs = getTextPathRenderAttributes({
          path: layer.path,
          align: layer.align,
          widthPx: frameW,
          heightPx: frameH,
          textWidthPx: textWidth,
          charCount: layer.text.length,
          wordCount,
        });
        const renderPath = pathAttrs.pathStartAngleDeg != null
          ? { ...layer.path, startAngleDeg: pathAttrs.pathStartAngleDeg }
          : layer.path;
        const pathD = getTextPathSvgD({ path: renderPath, widthPx: frameW, heightPx: frameH });
        const pathId = `pdf-export-textpath-${layer.id}`;
        const escText = layer.text.replace(/[<>&"']/g, (c) => {
          switch (c) { case "<": return "&lt;"; case ">": return "&gt;"; case "&": return "&amp;"; case '"': return "&quot;"; default: return "&amp;"; }
        });
        const dyAttr = pathAttrs.dy ? ` dy="${pathAttrs.dy}"` : "";
        const tlAttr = pathAttrs.textLength ? ` textLength="${pathAttrs.textLength}" lengthAdjust="${pathAttrs.lengthAdjust}"` : "";
        const wsAttr = pathAttrs.wordSpacingPx ? ` word-spacing="${pathAttrs.wordSpacingPx}"` : "";

        // Embed font as data URL inside the SVG so it works in the image context.
        let fontStyle = "";
        const fontBytes = await loadFontBytes(layer.fontId);
        if (fontBytes) {
          let binary = "";
          for (let i = 0; i < fontBytes.length; i++) binary += String.fromCharCode(fontBytes[i]!);
          const b64 = btoa(binary);
          fontStyle = `<style>@font-face{font-family:${JSON.stringify(layer.fontId)};src:url("data:font/ttf;base64,${b64}") format('truetype');}</style>`;
        }

        // Add padding to prevent clipping of glyphs that extend beyond the path bounds
        const pad = layer.fontSizePt * 2;
        const svgW = frameW + pad * 2;
        const svgH = frameH + pad * 2;

        const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="${-pad} ${-pad} ${svgW} ${svgH}">${fontStyle}<defs><path id="${pathId}" d="${pathD}" /></defs><text fill="${layer.color}" font-family="${layer.fontId}" font-size="${layer.fontSizePt}" font-weight="${layer.isBold ? 700 : 400}" font-style="${layer.isItalic ? "italic" : "normal"}" text-anchor="${pathAttrs.textAnchor}" dominant-baseline="middle"${tlAttr}${wsAttr}><textPath href="#${pathId}" startOffset="${pathAttrs.startOffset}"${dyAttr}>${escText}</textPath></text></svg>`;

        // Rasterize at 4× resolution for sharp text
        const rasterScale = 4;
        const rasterW = Math.round(svgW * rasterScale);
        const rasterH = Math.round(svgH * rasterScale);
        const svgBlob = new Blob([textSvg], { type: "image/svg+xml" });
        const svgUrl = URL.createObjectURL(svgBlob);
        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error("Failed to rasterize path text for PDF export"));
            el.src = svgUrl;
          });
          const cvs = document.createElement("canvas");
          cvs.width = rasterW;
          cvs.height = rasterH;
          const ctx = cvs.getContext("2d");
          if (ctx) {
            // Clear default white fill so transparent SVG text stays transparent
            ctx.clearRect(0, 0, rasterW, rasterH);
            ctx.drawImage(img, 0, 0, rasterW, rasterH);
            const pngDataUrl = cvs.toDataURL("image/png");
            const pngData = parseDataUrl(pngDataUrl);
            if (pngData) {
              const pdfImage = await pdf.embedPng(pngData.bytes);
              // Draw at the frame position in PDF bottom-up coordinates, adjusted for padding.
              const drawX = frameX - pad;
              const drawY = frameCy - frameH / 2 - pad; // bottom edge in PDF coords minus padding
              page.drawImage(pdfImage, { x: drawX, y: drawY, width: svgW, height: svgH });
            }
          }
        } finally {
          URL.revokeObjectURL(svgUrl);
        }
      }

      if (hasTransform) page.pushOperators(popGraphicsState());
    }
  }

  pdf.setTitle(`Customization export ${design.id}`);
  const bytes = await pdf.save();
  return new Blob([bytes as any], { type: "application/pdf" });
};
