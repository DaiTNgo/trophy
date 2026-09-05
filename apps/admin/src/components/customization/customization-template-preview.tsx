import { RotateCcw } from "lucide-react";
import {
  ProductCustomizationForm,
  ProductCustomizationPreview,
} from "@trophy/customization-react";
import {
  type CustomizationFormValues,
  type CustomizationTemplate,
  type ClipartFieldValue,
  type DynamicFontFamily,
  type ImageShapeFieldValue,
  type TextFieldValue,
} from "@trophy/customization";
import { createId, fileToBackground } from "./customization-template-ui";
import { BACKEND_URL } from "../../lib/fetch";


type PreviewChange = (fieldId: string, value: TextFieldValue | ImageShapeFieldValue | ClipartFieldValue | null) => void;

export function PreviewDialog({
  template,
  values,
  dynamicFonts = [],
  locale,
  onChange,
  onClose,
  onReset,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
  dynamicFonts?: DynamicFontFamily[];
  locale?: string;
  onChange: PreviewChange;
  onClose: () => void;
  onReset: () => void;
  pendingPdfFile?: File | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex bg-black/40 p-3 md:p-8">
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(260px,40vh)] overflow-hidden rounded-xl bg-ui-bg-base shadow-xl md:grid-cols-[minmax(0,1fr)_360px] md:grid-rows-none">
        <div className="flex min-h-0 flex-col bg-ui-bg-subtle">
          <ProductCustomizationPreview
            template={template}
            values={values}
            dynamicFonts={dynamicFonts}
            resolveFontUrl={(assetId) => `${BACKEND_URL}/api/storefront/brand-assets/fonts/file/${assetId}`}
            resolveStaticFontUrl={(fileName) => `${BACKEND_URL}/fonts/${fileName}`}
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
          </div>
          <ProductCustomizationForm
            template={template}
            values={values}
            dynamicFonts={dynamicFonts}
            locale={locale}
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
