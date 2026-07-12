import { useMemo, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import {
  ProductCustomizationForm,
  ProductCustomizationPreview,
} from "@trophy/customization-react";
import {
  buildDesignFromForm,
  type CustomizationFormValues,
  type CustomizationTemplate,
  type ClipartFieldValue,
  type ImageShapeFieldValue,
  type TextFieldValue,
} from "@trophy/customization";
import { createId, fileToBackground } from "./customization-template-ui";
import { exportVectorPdfClientSide } from "../../lib/pdf-export";

type PreviewChange = (fieldId: string, value: TextFieldValue | ImageShapeFieldValue | ClipartFieldValue | null) => void;

let measureSpan: HTMLSpanElement | null = null;
function measureTextDOM(text: string, fontSizePt: number, fontId: string): number {
  if (typeof window === "undefined" || !document.body) return text.length * fontSizePt * 0.55;
  if (!measureSpan) {
    measureSpan = document.createElement("span");
    measureSpan.style.position = "absolute";
    measureSpan.style.visibility = "hidden";
    measureSpan.style.whiteSpace = "pre";
    measureSpan.style.pointerEvents = "none";
    document.body.appendChild(measureSpan);
  }
  measureSpan.style.fontFamily = `"${fontId}", sans-serif`;
  measureSpan.style.fontSize = `${fontSizePt}px`;
  measureSpan.textContent = text;
  return measureSpan.getBoundingClientRect().width;
}

export function PreviewDialog({
  template,
  values,
  onChange,
  onClose,
  onReset,
  pendingPdfFile,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
  onChange: PreviewChange;
  onClose: () => void;
  onReset: () => void;
  pendingPdfFile?: File | null;
}) {
  const design = useMemo(() => buildDesignFromForm({ template, values, designId: "admin_preview", measureText: measureTextDOM }), [template, values]);
  const [isExporting, setIsExporting] = useState(false);

  async function exportPdf() {
    setIsExporting(true);
    try {
      const blob = await exportVectorPdfClientSide(template, design, pendingPdfFile ?? null);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${design.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40 p-3 md:p-8">
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(260px,40vh)] overflow-hidden rounded-xl bg-ui-bg-base shadow-xl md:grid-cols-[minmax(0,1fr)_360px] md:grid-rows-none">
        <div className="flex min-h-0 flex-col bg-ui-bg-subtle">
          <ProductCustomizationPreview
            template={template}
            values={values}
            resolveFontUrl={(assetId) => `${import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8787"}/api/admin/brand-assets/fonts/file/${assetId}`}
            resolveStaticFontUrl={(fileName) => `${import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8787"}/fonts/${fileName}`}
            onImageValueChange={(fieldId, value) => onChange(fieldId, value)}
          />
        </div>
        <aside className="overflow-y-auto border-l border-ui-border-base p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Preview</h2>
            <button type="button" onClick={onClose} className="rounded border px-3 py-1 text-sm">
              Close
            </button>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" onClick={onReset} className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm">
              <RotateCcw className="size-4" /> Reset data
            </button>
            <button type="button" onClick={exportPdf} disabled={isExporting} className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm disabled:opacity-50">
              <Download className="size-4" /> {isExporting ? "Exporting..." : "Export PDF"}
            </button>
          </div>
          <ProductCustomizationForm
            template={template}
            values={values}
            onUploadImage={async (_field, file) => {
              const asset = await fileToBackground(file);
              return {
                source: "upload",
                assetId: createId("local_asset"),
                previewUrl: asset.previewUrl,
                sourceWidthPx: asset.widthPx,
                sourceHeightPx: asset.heightPx,
                cropScale: 1,
                cropXRatio: 0,
                cropYRatio: 0,
                cropRotationDeg: 0,
              };
            }}
            onValueChange={(fieldId, value) => onChange(fieldId, value)}
          />
        </aside>
      </div>
    </div>
  );
}
