import { Heading, Text } from "@medusajs/ui";
import { EditorCanvas } from "../../components/customization/customization-template-editor";
import { Inspector } from "../../components/customization/customization-template-inspector";
import {
  LeftPanel,
  Rail,
} from "../../components/customization/customization-template-panels";
import type { useCreateProduct } from "./use-create-product";

type CreateProductCustomizationProps = {
  state: ReturnType<typeof useCreateProduct>;
};

export function CreateProductCustomization({
  state,
}: CreateProductCustomizationProps) {
  const {
    embeddedCustomization,
    embeddedEditor,
    previewBackgrounds,
    selectedPreviewAssetId,
    setSelectedPreviewAssetId,
    dynamicFonts,
  } = state;

  return (
    <section
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-base shadow-sm"
    >
      {/* <div className="flex items-center justify-between border-b border-ui-border-base px-4 py-3">
        <div>
          <Heading level="h2">Customization</Heading>
          <Text size="small" className="mt-1 text-ui-fg-subtle">
            Embedded product-create mode. Preview backgrounds come from created variant images and are not persisted as customization assets.
          </Text>
        </div>
        <div className="text-right">
          <Text size="small" className="text-ui-fg-subtle">
            Draft preserved in session
          </Text>
          <Text size="small" className="mt-1 text-ui-fg-base">
            {embeddedCustomization.canvasWidthPx && embeddedCustomization.canvasHeightPx
              ? `${embeddedCustomization.canvasWidthPx} x ${embeddedCustomization.canvasHeightPx}`
              : "Canvas not seeded yet"}
          </Text>
        </div>
      </div> */}
      <div className="grid min-h-0 flex-1 overflow-hidden grid-cols-[56px_280px_minmax(0,1fr)_320px]">
        <Rail
          activeTab={embeddedEditor.activeTab}
          onChange={embeddedEditor.setActiveTab}
        />
        <div className="min-h-0 overflow-y-auto overflow-x-hidden">
          <LeftPanel
            activeTab={embeddedEditor.activeTab}
            template={embeddedEditor.template}
            selectedLayerId={embeddedEditor.selectedLayerId}
            onAddText={embeddedEditor.addTextLayer}
            onAddTextOnPath={embeddedEditor.addTextOnPathLayer}
            onAddShape={embeddedEditor.addImageShape}
            onAddPolygon={embeddedEditor.addPolygon}
            onDrawShape={embeddedEditor.startDrawMode}
            onSelectLayer={embeddedEditor.setSelectedLayerId}
            onUpdateTemplate={embeddedEditor.updateTemplate}
            onUpdateField={embeddedEditor.updateField}
            onDelete={embeddedEditor.deleteSelectedLayer}
            onUploadBackground={() => {}}
            embeddedBackgrounds={{
              items: previewBackgrounds,
              selectedAssetId: selectedPreviewAssetId,
              onSelectAssetId: setSelectedPreviewAssetId,
            }}
          />
        </div>
        <EditorCanvas
          template={embeddedEditor.template}
          selectedLayerId={embeddedEditor.selectedLayerId}
          pathEditingLayerId={embeddedEditor.pathEditingLayerId}
          isDrawing={embeddedEditor.isDrawing}
          pendingVectorPoints={embeddedEditor.pendingVectorPoints}
          dynamicFonts={dynamicFonts}
          onSelectLayer={embeddedEditor.setSelectedLayerId}
          onPathEditingLayerChange={embeddedEditor.setPathEditingLayerId}
          onUpdateLayer={embeddedEditor.updateLayer}
          onUploadBackground={() => {}}
          onAddVectorPoint={embeddedEditor.addVectorPoint}
          onUndoVectorPoint={embeddedEditor.undoVectorPoint}
          onCloseVectorShape={embeddedEditor.closeVectorShape}
          onCancelDraw={embeddedEditor.cancelDrawMode}
        />
        <div className="min-h-0 overflow-y-auto overflow-x-hidden">
          <Inspector
            template={embeddedEditor.template}
            selectedLayer={embeddedEditor.selectedLayer}
            pathEditingLayerId={embeddedEditor.pathEditingLayerId}
            onUpdateLayer={embeddedEditor.updateLayer}
            onPathEditingLayerChange={embeddedEditor.setPathEditingLayerId}
            onUpdateTemplate={embeddedEditor.updateTemplate}
          />
        </div>
      </div>
    </section>
  );
}
