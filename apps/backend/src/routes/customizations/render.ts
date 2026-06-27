import { getTextPathRenderAttributes, getTextPathSvgD, vectorPointsToSvgPathD } from "@trophy/customization";
import type { CustomizationDesign, CustomizationTemplate } from "@trophy/customization";
import { PDFDocument, StandardFonts, grayscale } from "pdf-lib";

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const textPathD = (layer: Extract<CustomizationDesign["layers"][number], { type: "text" }>, width: number, height: number) => {
  const cx = layer.geometry.xRatio * width;
  const cy = layer.geometry.yRatio * height;
  const w = layer.geometry.widthRatio * width;
  const path = layer.path;
  if (path.type === "arc_up" || path.type === "arc_down") {
    const curve = Math.max(0, Math.min(1, path.curveAmount)) * w * (path.type === "arc_up" ? -0.35 : 0.35);
    return `M ${cx - w / 2} ${cy} Q ${cx} ${cy + curve} ${cx + w / 2} ${cy}`;
  }
  if (path.type === "circle_top" || path.type === "circle_bottom") {
    const radius = Math.max(1, path.radiusRatio * w);
    const sweep = path.type === "circle_top" ? 1 : 0;
    return `M ${cx - w / 2} ${cy} A ${radius} ${radius} 0 0 ${sweep} ${cx + w / 2} ${cy}`;
  }
  if (path.type === "custom" && path.points.length > 0) {
    const x0 = cx - w / 2;
    const h = layer.fontSizePt * Math.max(1, layer.text.split("\n").length) * 1.35;
    return path.points
      .map((point, index) => {
        const x = x0 + point.xRatio * w;
        const y = cy - h / 2 + point.yRatio * h;
        if (index === 0) return `M ${x} ${y}`;
        const previous = path.points[index - 1]!;
        const px = x0 + previous.xRatio * w;
        const py = cy - h / 2 + previous.yRatio * h;
        const c1x = px + (previous.outHandle?.xRatio ?? 0) * w;
        const c1y = py + (previous.outHandle?.yRatio ?? 0) * h;
        const c2x = x + (point.inHandle?.xRatio ?? 0) * w;
        const c2y = y + (point.inHandle?.yRatio ?? 0) * h;
        return `C ${c1x} ${c1y} ${c2x} ${c2y} ${x} ${y}`;
      })
      .join(" ");
  }
  if (path.type === "closed_ellipse") {
    const h = Math.max(1, (layer.geometry.heightRatio ?? layer.geometry.widthRatio) * height);
    const localD = getTextPathSvgD({ path, widthPx: w, heightPx: h });
    return localD.replace(/([MLACQ])\s*/g, "$1 ");
  }
  return `M ${cx - w / 2} ${cy} L ${cx + w / 2} ${cy}`;
};

const shapeClipSvg = ({
  shape,
  x,
  y,
  width,
  height,
  vectorPath,
}: {
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vectorPath?: import("@trophy/customization").VectorPath;
}) => {
  if (shape === "circle" || shape === "ellipse") {
    return `<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}" />`;
  }
  if (shape === "rounded_rectangle") {
    const radius = Math.min(width, height) * 0.12;
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" />`;
  }
  if (shape === "star") {
    const points = Array.from({ length: 10 }, (_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI) / 5;
      const radius = index % 2 === 0 ? 0.5 : 0.22;
      return `${x + width / 2 + Math.cos(angle) * width * radius},${y + height / 2 + Math.sin(angle) * height * radius}`;
    }).join(" ");
    return `<polygon points="${points}" />`;
  }
  if (shape === "heart") {
    return `<path d="M ${x + width / 2} ${y + height * 0.85} C ${x + width * 0.1} ${y + height * 0.55}, ${x} ${y + height * 0.25}, ${x + width * 0.25} ${y + height * 0.12} C ${x + width * 0.4} ${y}, ${x + width / 2} ${y + height * 0.16}, ${x + width / 2} ${y + height * 0.28} C ${x + width / 2} ${y + height * 0.16}, ${x + width * 0.6} ${y}, ${x + width * 0.75} ${y + height * 0.12} C ${x + width} ${y + height * 0.25}, ${x + width * 0.9} ${y + height * 0.55}, ${x + width / 2} ${y + height * 0.85} Z" />`;
  }
  if (shape === "vector" && vectorPath && vectorPath.points.length > 0) {
    const d = vectorPointsToSvgPathD(vectorPath.points, vectorPath.closed);
    const scaledD = d.replace(
      /([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)/g,
      (_, xRatio: string, yRatio: string) => `${x + Number(xRatio) * width} ${y + Number(yRatio) * height}`,
    );
    return `<path d="${scaledD}" />`;
  }
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" />`;
};

const parseDataUrl = (value: string) => {
  const match = /^data:(image\/(?:png|jpeg|svg\+xml));(?:charset=[^,]+,|base64,)?(.+)$/s.exec(value);
  if (!match) return null;
  const mimeType = match[1]!;
  if (mimeType === "image/svg+xml") return null;
  return {
    mimeType,
    bytes: Uint8Array.from(atob(match[2]!), (character) => character.charCodeAt(0)),
  };
};

const readImageBytes = async (url: string) => {
  const dataUrl = parseDataUrl(url);
  if (dataUrl) return dataUrl;
  const response = await fetch(url).catch(() => null);
  if (!response?.ok) return null;
  const mimeType = response.headers.get("content-type")?.split(";")[0] ?? "";
  if (mimeType !== "image/png" && mimeType !== "image/jpeg") return null;
  return {
    mimeType,
    bytes: new Uint8Array(await response.arrayBuffer()),
  };
};

export const renderPreviewSvg = (template: CustomizationTemplate, design: CustomizationDesign) => {
  const width = template.background?.widthPx ?? 900;
  const height = template.background?.heightPx ?? 900;
  const layers = [...design.layers].sort((a, b) => a.zIndex - b.zIndex);
  const body = layers
    .map((layer) => {
      if (layer.type === "text") {
        const x = layer.geometry.xRatio * width;
        const y = layer.geometry.yRatio * height;
        const anchor = layer.align === "left" || layer.align === "justified" ? "start" : layer.align === "right" ? "end" : "middle";
        if (layer.path.type !== "straight") {
          const pathId = `path-${escapeXml(layer.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
          if (layer.path.type === "closed_ellipse") {
            const frameWidth = layer.geometry.widthRatio * width;
            const frameHeight = Math.max(1, (layer.geometry.heightRatio ?? layer.geometry.widthRatio) * height);
            const x0 = layer.geometry.xRatio * width - frameWidth / 2;
            const y0 = layer.geometry.yRatio * height - frameHeight / 2;
            const textWidthPx = layer.text.length * layer.fontSizePt * 0.55;
            const wordCount = layer.text.trim() ? layer.text.trim().split(/\s+/).length : 0;
            const pathAttrs = getTextPathRenderAttributes({ path: layer.path, align: layer.align, widthPx: frameWidth, heightPx: frameHeight, textWidthPx, charCount: layer.text.length, wordCount });
            const textLength = pathAttrs.textLength ? ` textLength="${pathAttrs.textLength}" lengthAdjust="${pathAttrs.lengthAdjust}"` : "";
            const textBody = pathAttrs.dy ? `<tspan dy="${pathAttrs.dy}">${escapeXml(layer.text)}</tspan>` : escapeXml(layer.text);
            const renderLayer = pathAttrs.pathStartAngleDeg != null
              ? { ...layer, path: { ...layer.path, startAngleDeg: pathAttrs.pathStartAngleDeg } as typeof layer.path }
              : layer;
            const wordSpacing = pathAttrs.wordSpacingPx != null ? ` word-spacing="${pathAttrs.wordSpacingPx}"` : "";
            return `<g transform="translate(${x0} ${y0})"><path id="${pathId}" d="${textPathD(renderLayer, width, height)}" fill="none" /><text font-size="${layer.fontSizePt}" text-anchor="${pathAttrs.textAnchor}" fill="${escapeXml(layer.color)}"${textLength}${wordSpacing}><textPath href="#${pathId}" startOffset="${pathAttrs.startOffset}">${textBody}</textPath></text></g>`;
          }
          const pathAttrs = getTextPathRenderAttributes({ path: layer.path, align: layer.align, widthPx: layer.geometry.widthRatio * width, heightPx: layer.fontSizePt * Math.max(1, layer.text.split("\n").length) * 1.35 });
          const textLength = pathAttrs.textLength ? ` textLength="${pathAttrs.textLength}" lengthAdjust="${pathAttrs.lengthAdjust}"` : "";
          return `<path id="${pathId}" d="${textPathD(layer, width, height)}" fill="none" /><text font-size="${layer.fontSizePt}" text-anchor="${pathAttrs.textAnchor}" fill="${escapeXml(layer.color)}"${textLength}><textPath href="#${pathId}" startOffset="${pathAttrs.startOffset}">${escapeXml(layer.text)}</textPath></text>`;
        }
        return `<text x="${x}" y="${y}" font-size="${layer.fontSizePt}" text-anchor="${anchor}" dominant-baseline="middle" fill="${escapeXml(layer.color)}" transform="rotate(${layer.geometry.rotationDeg} ${x} ${y})">${escapeXml(layer.text)}</text>`;
      }
      const frameWidth = layer.geometry.widthRatio * width;
      const frameHeight = layer.geometry.heightRatio * height;
      const x = layer.geometry.xRatio * width - frameWidth / 2;
      const y = layer.geometry.yRatio * height - frameHeight / 2;
      const clipId = `clip-${escapeXml(layer.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
      return `<clipPath id="${clipId}">${shapeClipSvg({ shape: layer.shape.type, x, y, width: frameWidth, height: frameHeight, vectorPath: layer.shape.type === "vector" ? layer.shape.vectorPath : undefined })}</clipPath><image clip-path="url(#${clipId})" href="${escapeXml(layer.previewUrl)}" x="${x}" y="${y}" width="${frameWidth}" height="${frameHeight}" preserveAspectRatio="xMidYMid slice" />`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${template.background ? `<image href="${escapeXml(template.background.previewUrl)}" x="0" y="0" width="${width}" height="${height}" />` : ""}${body}</svg>`;
};

export const renderPdf = async (template: CustomizationTemplate, design: CustomizationDesign) => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([
    template.background?.widthPx ?? 900,
    template.background?.heightPx ?? 900,
  ]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const layer of design.layers) {
    if (layer.type !== "text") continue;
    page.drawText(layer.text, {
      x: layer.geometry.xRatio * page.getWidth(),
      y: page.getHeight() - layer.geometry.yRatio * page.getHeight(),
      size: layer.fontSizePt,
      font,
      color: grayscale(0),
    });
  }
  for (const layer of design.layers) {
    if (layer.type !== "image_shape") continue;
    const source = await readImageBytes(layer.previewUrl);
    if (!source) continue;
    const image = source.mimeType === "image/png"
      ? await pdf.embedPng(source.bytes)
      : await pdf.embedJpg(source.bytes);
    page.drawImage(image, {
      x: (layer.geometry.xRatio - layer.geometry.widthRatio / 2) * page.getWidth(),
      y: page.getHeight() - (layer.geometry.yRatio + layer.geometry.heightRatio / 2) * page.getHeight(),
      width: layer.geometry.widthRatio * page.getWidth(),
      height: layer.geometry.heightRatio * page.getHeight(),
    });
  }
  pdf.setTitle(`Customization preview ${design.id}`);
  const bytes = await pdf.save();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
};
