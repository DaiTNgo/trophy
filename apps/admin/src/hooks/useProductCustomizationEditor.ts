import { useState } from "react";
import {
  DEFAULT_TEMPLATE,
  type CustomizationTemplate,
} from "@trophy/customization";
import { getProductCustomizationPublishIssue } from "./product-customization-publish";
import { useTemplateEditorCore } from "./use-template-editor-core";

/** Editor that keeps the template in local state and saves it through `saveCustomization`. */
export function useProductCustomizationEditor(
  productId: string,
  initialCustomization: any,
  saveCustomization: (customization: any) => Promise<void>
) {
  const [template, setTemplate] = useState<CustomizationTemplate>(() => {
    if (initialCustomization?.enabled) {
      return {
        id: productId,
        productId,
        name: "Product Customization",
        revision: 1,
        status: "draft",
        background: null,
        layers: initialCustomization.layers || [],
        formFields: initialCustomization.formFields || [],
      };
    }
    return {
      ...DEFAULT_TEMPLATE,
      id: productId,
      productId,
    };
  });
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);

  const core = useTemplateEditorCore({
    template,
    applyTemplateUpdate: setTemplate,
  });

  async function saveDraft() {
    try {
      await saveCustomization({
        enabled: true,
        canvasWidthPx: template.background?.widthPx || initialCustomization?.canvasWidthPx || 1000,
        canvasHeightPx: template.background?.heightPx || initialCustomization?.canvasHeightPx || 1000,
        layers: template.layers,
        formFields: template.formFields,
      });
      core.flashMessage("Saved");
    } catch (e: any) {
      console.error(e);
      core.flashMessage("Error saving");
    }
  }

  async function publish() {
    try {
      const publishIssue = getProductCustomizationPublishIssue({
        productId,
        template,
        initialCustomization,
      });
      if (publishIssue) {
        throw new Error(publishIssue);
      }
      await saveDraft();
      core.flashMessage("Published");
    } catch (e: any) {
      if (e instanceof Error && e.message) {
        alert(e.message);
      } else {
        alert(e.error || "Unknown error");
      }
    }
  }

  function updateBackground(asset: any, pdfFile?: File) {
    if (pdfFile) {
      setPendingPdfFile(pdfFile);
    }
    core.updateTemplate((current) => ({
      ...current,
      background: {
        ...asset,
        pendingPdfUpload: !!pdfFile,
      },
    }));
  }

  return {
    ...core,
    saveDraft,
    publish,
    updateBackground,
    pendingPdfFile,
  };
}
