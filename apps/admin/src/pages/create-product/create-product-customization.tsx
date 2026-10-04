import type { BackgroundAsset } from "@trophy/customization";
import { CustomizationEditorWorkspace } from "../../components/customization/customization-editor-workspace";
import type { useCreateProduct } from "./use-create-product";

export type CreateProductCustomizationState = Pick<
  ReturnType<typeof useCreateProduct>,
  | "embeddedEditor"
  | "previewBackgrounds"
  | "selectedPreviewAssetId"
  | "setSelectedPreviewAssetId"
  | "dynamicFonts"
>;

type CreateProductCustomizationProps = {
  state: CreateProductCustomizationState;
  onUploadBackground?: (background: BackgroundAsset, file?: File) => void;
};

export function CreateProductCustomization({
  state,
  onUploadBackground = () => {},
}: CreateProductCustomizationProps) {
  const {
    embeddedEditor,
    previewBackgrounds,
    selectedPreviewAssetId,
    setSelectedPreviewAssetId,
    dynamicFonts,
  } = state;

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-base shadow-sm">
      <CustomizationEditorWorkspace
        editor={embeddedEditor}
        dynamicFonts={dynamicFonts}
        onUploadBackground={onUploadBackground}
        embeddedBackgrounds={{
          items: previewBackgrounds,
          selectedAssetId: selectedPreviewAssetId,
          onSelectAssetId: setSelectedPreviewAssetId,
        }}
      />
    </section>
  );
}
