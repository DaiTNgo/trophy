import {
  type BackgroundAsset,
  type CustomizationTemplate,
  type ProductCustomization,
} from "@trophy/customization";
import { useEffect, useMemo, useState } from "react";
import { useTemplateEditorCore } from "./use-template-editor-core";

type EmbeddedCustomizationDraft = Pick<
  ProductCustomization,
  "enabled" | "canvasWidthPx" | "canvasHeightPx" | "layers" | "formFields"
>;

const toTemplate = ({
  productTitle,
  productId,
  background,
  draft,
}: {
  productTitle: string;
  productId: string;
  background: BackgroundAsset | null;
  draft: EmbeddedCustomizationDraft;
}): CustomizationTemplate => ({
  id: `embedded_${productId || "draft"}`,
  productId,
  name: productTitle.trim() || "Product customization",
  revision: 1,
  status: "draft",
  background,
  layers: draft.layers,
  formFields: draft.formFields,
});

/** Editor whose template is a controlled `draft` owned by the parent. */
export function useEmbeddedProductCustomizationEditor({
  productTitle,
  productId,
  background,
  draft,
  onDraftChange,
}: {
  productTitle: string;
  productId: string;
  background: BackgroundAsset | null;
  draft: EmbeddedCustomizationDraft;
  onDraftChange: (draft: EmbeddedCustomizationDraft) => void;
}) {
  const baseTemplate = useMemo(
    () => toTemplate({ productTitle, productId, background, draft }),
    [background, draft, productId, productTitle],
  );
  const [template, setTemplate] = useState<CustomizationTemplate>(baseTemplate);

  useEffect(() => {
    setTemplate((current) => ({
      ...current,
      name: baseTemplate.name,
      productId: baseTemplate.productId,
      background: baseTemplate.background,
      layers: draft.layers,
      formFields: draft.formFields,
    }));
  }, [baseTemplate.background, baseTemplate.name, baseTemplate.productId, draft.formFields, draft.layers]);

  return useTemplateEditorCore({
    template,
    applyTemplateUpdate: (updater) => {
      setTemplate((current) => {
        const nextTemplate = updater(current);
        onDraftChange({
          enabled: true,
          canvasWidthPx: nextTemplate.background?.widthPx ?? draft.canvasWidthPx,
          canvasHeightPx: nextTemplate.background?.heightPx ?? draft.canvasHeightPx,
          layers: nextTemplate.layers,
          formFields: nextTemplate.formFields,
        });
        return nextTemplate;
      });
    },
  });
}
