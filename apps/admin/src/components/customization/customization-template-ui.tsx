import { type BackgroundAsset, type ShapeType, vectorPointsToSvgPathD, type VectorPath } from "@trophy/customization";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export type RailTab = "blocks" | "layers" | "form" | "background";

export const createId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-ui-fg-base">{title}</p>
      <p className="mt-1 text-xs text-ui-fg-muted">{subtitle}</p>
    </div>
  );
}

export function Input({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="w-full rounded-md border border-ui-border-base px-2 py-1 text-sm" />;
}

export function NumberInput({ label, value, onChange, disabled }: { label: string; value: number; onChange: (value: number) => void; disabled?: boolean }) {
  return (
    <label className="block text-xs font-medium text-ui-fg-muted">
      {label}
      <input type="number" disabled={disabled} value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 w-full rounded-md border border-ui-border-base px-2 py-1 text-sm text-ui-fg-base disabled:bg-ui-bg-subtle" />
    </label>
  );
}

export function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs font-medium text-ui-fg-muted">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-md border border-ui-border-base px-2 py-1 text-sm text-ui-fg-base">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
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
      const previewUrl = canvas.toDataURL("image/png");
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

export function cssShapeClip(shape: ShapeType, vectorPath?: VectorPath) {
  if (shape === "circle") return "circle(50% at 50% 50%)";
  if (shape === "ellipse") return "ellipse(50% 40% at 50% 50%)";
  if (shape === "star") return "polygon(50% 0%, 61% 34%, 98% 35%, 68% 56%, 79% 91%, 50% 70%, 21% 91%, 32% 56%, 2% 35%, 39% 34%)";
  if (shape === "heart") return "path('M 50 88 C 20 62 4 45 12 25 C 20 6 42 10 50 27 C 58 10 80 6 88 25 C 96 45 80 62 50 88 Z')";
  if (shape === "vector" && vectorPath) return `path('${vectorPointsToSvgPathD(vectorPath.points, vectorPath.closed)}')`;
  return "inset(0)";
}
