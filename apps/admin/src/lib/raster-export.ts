import {
  FONT_FILES,
  getShapeSvgClip,
  getTextPathRenderAttributes,
  getTextPathSvgD,
  layerGeometryToPixels,
  type CustomizationDesign,
  type CustomizationTemplate,
  type RuntimeImageShapeLayer,
  type RuntimeTextLayer,
} from "@trophy/customization";

export type RasterExportFormat = "image/png" | "image/webp";

type RasterExportOptions = {
  format?: RasterExportFormat;
  scale?: number;
  resolveFontUrl?: (fontId: string) => string;
};

const MIN_IMAGE_SCALE = 0.02;

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => {
    switch (character) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case '"': return "&quot;";
      default: return "&amp;";
    }
  });
}

function getImageRect(layer: RuntimeImageShapeLayer, frameWidth: number, frameHeight: number) {
  const sourceWidth = Math.max(1, layer.sourceWidthPx);
  const sourceHeight = Math.max(1, layer.sourceHeightPx);
  const scale = Math.max(MIN_IMAGE_SCALE, layer.cropScale || 1);
  const baseScale = layer.fit === "contain"
    ? Math.min(frameWidth / sourceWidth, frameHeight / sourceHeight)
    : Math.max(frameWidth / sourceWidth, frameHeight / sourceHeight);
  const width = sourceWidth * baseScale * scale;
  const height = sourceHeight * baseScale * scale;
  const centerX = frameWidth / 2 + (layer.cropXRatio || 0) * frameWidth;
  const centerY = frameHeight / 2 + (layer.cropYRatio || 0) * frameHeight;

  return { x: centerX - width / 2, y: centerY - height / 2, width, height, centerX, centerY };
}

function textMarkup(layer: RuntimeTextLayer, canvasWidth: number, canvasHeight: number) {
  const width = layer.geometry.widthRatio * canvasWidth;
  const closedPath = layer.path.type === "closed_ellipse";
  const height = closedPath
    ? Math.max(1, (layer.geometry.heightRatio ?? layer.geometry.widthRatio) * canvasHeight)
    : layer.fontSizePt * Math.max(1, layer.text.split("\n").length) * 1.35;
  const x = layer.geometry.xRatio * canvasWidth - width / 2;
  const y = layer.geometry.yRatio * canvasHeight - height / 2;
  const style = `fill="${escapeXml(layer.color)}" font-family="${escapeXml(layer.fontId)}" font-size="${layer.fontSizePt}" font-weight="${layer.isBold ? 700 : 400}" font-style="${layer.isItalic ? "italic" : "normal"}"`;
  const rotation = `rotate(${layer.geometry.rotationDeg} ${x + width / 2} ${y + height / 2})`;

  if (layer.path.type === "straight") {
    const anchor = layer.align === "left" ? "start" : layer.align === "right" ? "end" : "middle";
    const textX = layer.align === "left" ? x : layer.align === "right" ? x + width : x + width / 2;
    const lines = layer.text.split("\n");
    const firstY = y + layer.fontSizePt;
    return `<text ${style} text-anchor="${anchor}" transform="${rotation}">${lines.map((line, index) => `<tspan x="${textX}" y="${firstY + index * layer.fontSizePt * 1.35}">${escapeXml(line)}</tspan>`).join("")}</text>`;
  }

  const textWidth = layer.text.length * layer.fontSizePt * 0.55;
  const wordCount = layer.text.trim() ? layer.text.trim().split(/\s+/).length : 0;
  const attributes = getTextPathRenderAttributes({ path: layer.path, align: layer.align, widthPx: width, heightPx: height, textWidthPx: textWidth, charCount: layer.text.length, wordCount });
  const path = attributes.pathStartAngleDeg == null ? layer.path : { ...layer.path, startAngleDeg: attributes.pathStartAngleDeg };
  const pathId = `export-text-path-${layer.id}`;
  const dy = attributes.dy ? ` dy="${attributes.dy}"` : "";
  const textLength = attributes.textLength ? ` textLength="${attributes.textLength}" lengthAdjust="${attributes.lengthAdjust}"` : "";
  const wordSpacing = attributes.wordSpacingPx ? ` word-spacing="${attributes.wordSpacingPx}"` : "";
  // getTextPathSvgD produces path data in local space (0,0 → width,height).
  // Wrap in translate(x,y) so the path is placed at the correct canvas position.
  return `<g transform="${rotation}"><g transform="translate(${x} ${y})"><defs><path id="${pathId}" d="${getTextPathSvgD({ path, widthPx: width, heightPx: height })}" /></defs><text ${style} text-anchor="${attributes.textAnchor}" dominant-baseline="middle"${textLength}${wordSpacing}><textPath href="#${pathId}" startOffset="${attributes.startOffset}"${dy}>${escapeXml(layer.text)}</textPath></text></g></g>`;
}

function imageMarkup(layer: RuntimeImageShapeLayer, canvasWidth: number, canvasHeight: number) {
  const rect = layerGeometryToPixels({ geometry: layer.geometry, background: { widthPx: canvasWidth, heightPx: canvasHeight } });
  const image = getImageRect(layer, rect.widthPx, rect.heightPx);
  const clipId = `export-clip-${layer.id}`;
  const x = rect.xPx;
  const y = rect.yPx;
  const rotateLayer = `rotate(${layer.geometry.rotationDeg} ${x + rect.widthPx / 2} ${y + rect.heightPx / 2})`;
  const rotateCrop = `rotate(${layer.cropRotationDeg} ${image.centerX} ${image.centerY})`;
  const clipElement = getShapeSvgClip({
    shape: layer.shape.type,
    widthPx: rect.widthPx,
    heightPx: rect.heightPx,
    vectorPath: layer.shape.type === "vector" ? layer.shape.vectorPath : undefined,
  });
  return `<g transform="${rotateLayer}"><g transform="translate(${x} ${y})"><defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse">${clipElement}</clipPath></defs><g clip-path="url(#${clipId})"><image href="${escapeXml(layer.previewUrl)}" x="${image.x}" y="${image.y}" width="${image.width}" height="${image.height}" preserveAspectRatio="none" transform="${rotateCrop}" /></g></g></g>`;
}

export function buildRasterExportSvg(template: CustomizationTemplate, design: CustomizationDesign) {
  const width = template.background?.widthPx ?? 900;
  const height = template.background?.heightPx ?? 900;
  const background = template.background?.previewUrl
    ? `<image href="${escapeXml(template.background.previewUrl)}" width="${width}" height="${height}" preserveAspectRatio="none" />`
    : `<rect width="${width}" height="${height}" fill="white" />`;
  const layers = [...design.layers].sort((left, right) => left.zIndex - right.zIndex).map((layer) =>
    layer.type === "text" ? textMarkup(layer, width, height) : imageMarkup(layer, width, height),
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${background}${layers}</svg>`;
}

async function toDataUrl(url: string) {
  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) throw new Error(`Could not load export asset (${response.status}).`);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read export asset."));
    reader.readAsDataURL(blob);
  });
}

async function inlineAssetUrls(svg: string) {
  const urls = Array.from(new Set(Array.from(svg.matchAll(/href="([^"]+)"/g), (match) => match[1]!)));
  let inlined = svg;
  for (const url of urls) {
    if (url.startsWith("#") || url.startsWith("data:") || url.startsWith("blob:")) continue;
    const dataUrl = await toDataUrl(url);
    inlined = inlined.replaceAll(`href="${url}"`, `href="${dataUrl}"`);
  }
  return inlined;
}

async function inlineFonts(svg: string, design: CustomizationDesign, resolveFontUrl?: (fontId: string) => string) {
  const fontIds = Array.from(new Set(design.layers.flatMap((layer) => layer.type === "text" ? [layer.fontId] : [])));
  const fontFaces = await Promise.all(fontIds.map(async (fontId) => {
    const staticFont = FONT_FILES[fontId];
    const url = resolveFontUrl?.(fontId) ?? (staticFont ? `/fonts/${staticFont}` : null);
    if (!url) return "";
    const dataUrl = await toDataUrl(url);
    return `@font-face{font-family:${JSON.stringify(fontId)};src:url(${JSON.stringify(dataUrl)}) format('truetype');}`;
  }));
  if (!fontFaces.some(Boolean)) return svg;
  // Insert <style> right after the <svg ...> opening tag.
  return svg.replace(/(<svg[^>]*>)/, `$1<style>${fontFaces.join("")}</style>`);
}

function canvasBlob(canvas: HTMLCanvasElement, format: RasterExportFormat) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not encode the preview image.")), format, 0.92);
  });
}

export function rasterExportExtension(type: string) {
  return type === "image/webp" ? "webp" : "png";
}

export async function exportRasterPreviewClientSide(template: CustomizationTemplate, design: CustomizationDesign, options: RasterExportOptions = {}) {
  await document.fonts?.ready;
  const scale = Math.max(1, options.scale ?? 2);
  const width = template.background?.widthPx ?? 900;
  const height = template.background?.heightPx ?? 900;
  const svg = await inlineFonts(await inlineAssetUrls(buildRasterExportSvg(template, design)), design, options.resolveFontUrl);
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Could not render the preview image."));
      element.src = svgUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create an image export canvas.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvasBlob(canvas, options.format ?? "image/webp");
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
