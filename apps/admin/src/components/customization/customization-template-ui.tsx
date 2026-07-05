import { type BackgroundAsset, type ShapeType, vectorPointsToSvgPathD, type CustomizationLayer, FONT_FILES } from "@trophy/customization";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker?url";
import { useMemo } from "react";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export type RailTab = "blocks" | "layers" | "form" | "background";

export const createId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

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

  const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8787";

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
                src: url('${backendUrl}/api/admin/brand-assets/fonts/file/${v.assetId}') format('truetype');
              }
            `}} />
          ));
        }

        // Static font fallback
        // We can't await inside render, so we'll just inject the 4 variants if they exist in FONT_FILES
        return ["regular", "bold", "italic", "bold-italic"].map(weight => {
          const variantId = `${familyId}-${weight}`;
          const file = FONT_FILES[variantId];
          if (!file) return null;
          return (
            <style key={variantId} dangerouslySetInnerHTML={{ __html: `
              @font-face {
                font-family: '${variantId}';
                src: url('${backendUrl}/fonts/${file}') format('truetype');
              }
            `}} />
          );
        });
      })}
    </>
  );
}

export function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-ui-fg-base">{title}</p>
      <p className="mt-1 text-xs text-ui-fg-muted">{subtitle}</p>
    </div>
  );
}

export function Input({ value, onChange, placeholder, onFocus }: { value: string; onChange: (value: string) => void; placeholder?: string; onFocus?: () => void }) {
  return <input value={value} placeholder={placeholder} onFocus={onFocus} onChange={(event) => onChange(event.target.value)} className="w-full rounded-md border border-ui-border-base px-2 py-1 text-sm" />;
}

export function NumberInput({ label, value, onChange, disabled }: { label: string; value: number; onChange: (value: number) => void; disabled?: boolean }) {
  return (
    <label className="block text-xs font-medium text-ui-fg-muted">
      {label}
      <input type="number" disabled={disabled} value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 w-full rounded-md border border-ui-border-base px-2 py-1 text-sm text-ui-fg-base disabled:bg-ui-bg-subtle" />
    </label>
  );
}

export function Select({ label, value, options, onChange }: { label: string; value: string; options: (string | { value: string; label: string })[]; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs font-medium text-ui-fg-muted">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-md border border-ui-border-base px-2 py-1 text-sm text-ui-fg-base">
        {options.map((option) => {
          const optValue = typeof option === "string" ? option : option.value;
          const optLabel = typeof option === "string" ? option : option.label;
          return <option key={optValue} value={optValue}>{optLabel}</option>;
        })}
      </select>
    </label>
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
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create canvas context");
      await page.render({ canvasContext: ctx, viewport } as any).promise;
      const previewUrl = canvas.toDataURL("image/webp", 0.9);
      return {
        assetId: createId("background"),
        filename: file.name,
        mimeType: file.type,
        previewUrl,
        widthPx: viewport.width / 2,
        heightPx: viewport.height / 2,
        pdfPageCount: pdf.numPages,
        pendingPdfUpload: true,
      };
    } catch (e) {
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
