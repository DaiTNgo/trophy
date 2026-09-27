import {
  type BackgroundAsset,
  type CustomizationFormField,
  type CustomizationLayer,
  type ShapeType,
  type VectorPoint,
  vectorPointsToSvgPathD,
  FONT_FILES,
} from "@trophy/customization";
import { useMemo } from "react";
import { renderPdfBufferToDataUrl } from "../../lib/pdf-preview";
import { BACKEND_URL } from "../../lib/fetch";

export type RailTab = "blocks" | "layers" | "form" | "background";

export const createId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export function createDefaultTextLayer({
  zIndex,
  order,
}: {
  zIndex: number;
  order: number;
}): { layer: CustomizationLayer; field: CustomizationFormField } {
  const id = createId("text");
  const fieldId = createId("field");
  return {
    layer: {
      id,
      name: "Text layer",
      type: "text",
      hidden: false,
      locked: false,
      zIndex,
      geometry: { xRatio: 0.5, yRatio: 0.5, widthRatio: 0.28, rotationDeg: 0 },
      text: {
        sampleText: "YOUR TEXT",
        maxLines: 1,
        minFontSizePt: 8,
        maxFontSizePt: 20,
        alignPolicy: { mode: "fixed", align: "center" },
        colorPolicy: { mode: "fixed", color: "#111111" },
        fontPolicy: { mode: "fixed", fontId: "sans" },
        formatPolicy: { mode: "fixed", isBold: false, isItalic: false },
        path: { type: "straight" },
      },
    },
    field: {
      id: fieldId,
      layerId: id,
      label: "Text",
      placeholder: "YOUR TEXT",
      required: true,
      order,
    },
  };
}

export function createDefaultTextOnPathLayer({
  zIndex,
  order,
}: {
  zIndex: number;
  order: number;
}): { layer: CustomizationLayer; field: CustomizationFormField } {
  const id = createId("text_path");
  const fieldId = createId("field");
  return {
    layer: {
      id,
      name: "Text on path",
      type: "text",
      hidden: false,
      locked: false,
      zIndex,
      geometry: { xRatio: 0.5, yRatio: 0.5, widthRatio: 0.34, heightRatio: 0.18, rotationDeg: 0 },
      text: {
        sampleText: "YOUR TEXT",
        maxLines: 1,
        minFontSizePt: 8,
        maxFontSizePt: 20,
        alignPolicy: { mode: "fixed", align: "center" },
        colorPolicy: { mode: "fixed", color: "#111111" },
        fontPolicy: { mode: "fixed", fontId: "sans" },
        formatPolicy: { mode: "fixed", isBold: false, isItalic: false },
        path: {
          type: "closed_ellipse",
          bounds: { xRatio: 0.5, yRatio: 0.5, widthRatio: 1, heightRatio: 1 },
          startAngleDeg: 270,
          direction: "clockwise",
          placement: "over_path",
        },
      },
    },
    field: {
      id: fieldId,
      layerId: id,
      label: "Text on path",
      placeholder: "YOUR TEXT",
      required: true,
      order,
    },
  };
}

export function createDefaultImageShapeLayer(
  shape: ShapeType,
  {
    zIndex,
    order,
  }: {
    zIndex: number;
    order: number;
  },
): { layer: CustomizationLayer; field: CustomizationFormField } {
  const id = createId("image_shape");
  const fieldId = createId("field");
  return {
    layer: {
      id,
      name: shapeLabel(shape),
      type: "image_shape",
      hidden: false,
      locked: false,
      zIndex,
      geometry: { xRatio: 0.5, yRatio: 0.5, widthRatio: 0.2, heightRatio: 0.2, rotationDeg: 0 },
      shape: { type: shape, lockAspectRatio: ["circle", "star", "heart"].includes(shape) },
      upload: { fit: "cover", defaultCrop: { scale: 1, xRatio: 0, yRatio: 0 } },
    },
    field: {
      id: fieldId,
      layerId: id,
      label: "Upload image",
      helpText: "Your image will be clipped to the selected shape.",
      required: false,
      order,
    },
  };
}

export function createDefaultPolygonLayer(
  sides: number,
  {
    zIndex,
    order,
  }: {
    zIndex: number;
    order: number;
  },
): { layer: CustomizationLayer; field: CustomizationFormField } {
  const actualSides = Math.max(3, Number.isFinite(sides) ? Math.round(sides) : 6);
  const id = createId("image_shape");
  const fieldId = createId("field");
  const radius = 0.4;
  const cx = 0.5;
  const cy = 0.5;
  const polygonPoints: VectorPoint[] = Array.from({ length: actualSides }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / actualSides;
    return {
      id: createId("vector_point"),
      type: "corner" as const,
      xRatio: cx + Math.cos(angle) * radius,
      yRatio: cy + Math.sin(angle) * radius,
    };
  });
  return {
    layer: {
      id,
      name: `Polygon (${actualSides})`,
      type: "image_shape",
      hidden: false,
      locked: false,
      zIndex,
      geometry: { xRatio: 0.5, yRatio: 0.5, widthRatio: 0.25, heightRatio: 0.25, rotationDeg: 0 },
      shape: { type: "vector", lockAspectRatio: false, vectorPath: { points: polygonPoints, closed: true } },
      upload: { fit: "cover", defaultCrop: { scale: 1, xRatio: 0, yRatio: 0 } },
    },
    field: {
      id: fieldId,
      layerId: id,
      label: "Upload image",
      helpText: "Your image will be clipped to the polygon shape.",
      required: false,
      order,
    },
  };
}

export function createDefaultVectorShapeLayer(
  points: VectorPoint[],
  {
    zIndex,
    order,
  }: {
    zIndex: number;
    order: number;
  },
): { layer: CustomizationLayer; field: CustomizationFormField } {
  const id = createId("image_shape");
  const fieldId = createId("field");

  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  points.forEach((p) => {
    if (p.xRatio < minX) minX = p.xRatio;
    if (p.xRatio > maxX) maxX = p.xRatio;
    if (p.yRatio < minY) minY = p.yRatio;
    if (p.yRatio > maxY) maxY = p.yRatio;
  });

  const widthRatio = Math.max(0.01, maxX - minX);
  const heightRatio = Math.max(0.01, maxY - minY);
  const xRatio = minX + widthRatio / 2;
  const yRatio = minY + heightRatio / 2;

  const normalizedPoints = points.map((p) => ({
    ...p,
    xRatio: (p.xRatio - minX) / widthRatio,
    yRatio: (p.yRatio - minY) / heightRatio,
  }));

  return {
    layer: {
      id,
      name: "Vector shape",
      type: "image_shape",
      hidden: false,
      locked: false,
      zIndex,
      geometry: { xRatio, yRatio, widthRatio, heightRatio, rotationDeg: 0 },
      shape: { type: "vector", lockAspectRatio: true, vectorPath: { points: normalizedPoints, closed: true } },
      upload: { fit: "cover", defaultCrop: { scale: 1, xRatio: 0, yRatio: 0 } },
    },
    field: {
      id: fieldId,
      layerId: id,
      label: "Upload image",
      helpText: "Your image will be clipped to the selected shape.",
      required: false,
      order,
    },
  };
}
export function FontLoader({ layers, dynamicFonts = [] }: { layers: CustomizationLayer[] | any[]; dynamicFonts?: import("@trophy/customization").DynamicFontFamily[] }) {
  const fontFamilies = useMemo(() => {
    const ids = new Set<string>();
    for (const layer of layers) {
      if (layer.type === "text") {
        const fontId = layer.fontId || (layer.text?.fontPolicy?.mode === "fixed" ? layer.text.fontPolicy.fontId : layer.text?.fontPolicy?.defaultFontId);
        if (fontId) ids.add(fontId);
      }
    }
    return Array.from(ids);
  }, [layers]);

  return (
    <>
      {fontFamilies.map((familyId) => {
        const dynamicFont = dynamicFonts.find(f => f.id === familyId);
        if (dynamicFont) {
          const variants = [];
          if (dynamicFont.regularAssetId) variants.push({ variantId: dynamicFont.regularAssetId, assetId: dynamicFont.regularAssetId });
          if (dynamicFont.boldAssetId) variants.push({ variantId: dynamicFont.boldAssetId, assetId: dynamicFont.boldAssetId });
          if (dynamicFont.italicAssetId) variants.push({ variantId: dynamicFont.italicAssetId, assetId: dynamicFont.italicAssetId });
          if (dynamicFont.boldItalicAssetId) variants.push({ variantId: dynamicFont.boldItalicAssetId, assetId: dynamicFont.boldItalicAssetId });
          return variants.map(v => (
            <style key={v.variantId} dangerouslySetInnerHTML={{ __html: `
              @font-face {
                font-family: '${v.variantId}';
                src: url('${BACKEND_URL}/api/storefront/brand-assets/fonts/file/${v.assetId}') format('truetype');
              }
            `}} />
          ));
        }

        // Static font fallback
        const directFile = FONT_FILES[familyId];
        const directStyle = directFile ? (
          <style key={familyId} dangerouslySetInnerHTML={{ __html: `
            @font-face {
              font-family: '${familyId}';
              src: url('${BACKEND_URL}/fonts/${directFile}') format('truetype');
            }
          `}} />
        ) : null;

        return (
          <span key={familyId}>
            {directStyle}
            {["regular", "bold", "italic", "bold-italic"].map(weight => {
              const variantId = `${familyId}-${weight}`;
              const file = FONT_FILES[variantId];
              if (!file) return null;
              return (
                <style key={variantId} dangerouslySetInnerHTML={{ __html: `
                  @font-face {
                    font-family: '${variantId}';
                    src: url('${BACKEND_URL}/fonts/${file}') format('truetype');
                  }
                `}} />
              );
            })}
          </span>
        );
      })}
    </>
  );
}



export function BackgroundUpload({ onUpload, hidden }: { onUpload: (background: BackgroundAsset, file: File) => void; hidden?: boolean }) {
  return (
    <label className={hidden ? "sr-only" : "inline-flex cursor-pointer rounded-md border border-ui-border-base px-3 py-2 text-sm"}>
      {hidden ? "Upload" : "Upload / replace"}
      <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        void fileToBackground(file).then((bg) => onUpload(bg, file));
      }} />
    </label>
  );
}

export async function fileToBackground(file: File): Promise<BackgroundAsset> {
  if (file.type === "application/pdf") {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await renderPdfBufferToDataUrl(arrayBuffer, 2.0, "image/webp", 0.9);
      return {
        assetId: createId("background"),
        filename: file.name,
        mimeType: file.type,
        previewUrl: result.dataUrl,
        widthPx: Math.round(result.width / 2),
        heightPx: Math.round(result.height / 2),
        pdfPageCount: result.numPages,
        pendingPdfUpload: true,
      };
    } catch {
      throw new Error("Failed to read PDF file.");
    }
  }

  const previewUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = previewUrl;
  });
  return {
    assetId: createId("background"),
    filename: file.name,
    mimeType: file.type,
    previewUrl,
    widthPx: image.naturalWidth || 900,
    heightPx: image.naturalHeight || 900,
  };
}

export function shapeLabel(shape: ShapeType) {
  return shape.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function cssShapeClip(shape: ShapeType, layerId?: string) {
  if (shape === "circle") return "ellipse(50% 50% at 50% 50%)";
  if (shape === "ellipse") return "ellipse(50% 40% at 50% 50%)";
  if (shape === "star") return "polygon(50.00% 0.00%, 62.93% 32.20%, 97.55% 34.55%, 70.92% 56.80%, 79.39% 90.45%, 50.00% 72.00%, 20.61% 90.45%, 29.08% 56.80%, 2.45% 34.55%, 37.07% 32.20%)";
  if (shape === "heart") return "url(#clip-shape-heart)";
  if (shape === "vector" && layerId) return `url(#clip-vector-${layerId})`;
  return "inset(0)";
}


export function ShapeClipPaths({ layers }: { layers?: CustomizationLayer[] }) {
  return (
    <svg width="0" height="0" className="absolute pointer-events-none">
      <defs>
        <clipPath id="clip-shape-heart" clipPathUnits="objectBoundingBox">
          <path d="M 0.5 0.85 C 0.1 0.55 0 0.25 0.25 0.12 C 0.4 0 0.5 0.16 0.5 0.28 C 0.5 0.16 0.6 0 0.75 0.12 C 1 0.25 0.9 0.55 0.5 0.85 Z" />
        </clipPath>
        {layers?.map((layer) => {
          if (layer.type === "image_shape" && layer.shape.type === "vector" && layer.shape.vectorPath) {
            return (
              <clipPath key={layer.id} id={`clip-vector-${layer.id}`} clipPathUnits="objectBoundingBox">
                <path d={vectorPointsToSvgPathD(layer.shape.vectorPath.points, layer.shape.vectorPath.closed)} />
              </clipPath>
            );
          }
          return null;
        })}
      </defs>
    </svg>
  );
}
