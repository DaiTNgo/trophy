import { Button } from "@medusajs/ui";
import { Eye } from "lucide-react";
import type { ComponentProps } from "react";
import type { TemplateEditorCore } from "../../hooks/use-template-editor-core";
import { EditorCanvas } from "./customization-template-editor";
import { Inspector } from "./customization-template-inspector";
import { LeftPanel, Rail } from "./customization-template-panels";
import { PreviewDialog } from "./customization-template-preview";

type LeftPanelProps = ComponentProps<typeof LeftPanel>;

/** Four-column editor workspace (rail, panel, canvas, inspector) plus the preview dialog. */
export function CustomizationEditorWorkspace({
  editor,
  dynamicFonts,
  embeddedBackgrounds,
  onUploadBackground,
  pendingPdfFile = null,
  className = "",
}: {
  editor: TemplateEditorCore;
  dynamicFonts: ComponentProps<typeof EditorCanvas>["dynamicFonts"];
  embeddedBackgrounds: LeftPanelProps["embeddedBackgrounds"];
  onUploadBackground: LeftPanelProps["onUploadBackground"];
  pendingPdfFile?: File | null;
  className?: string;
}) {
  return (
    <>
      <div
        className={`grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden grid-cols-[56px_280px_minmax(0,1fr)_320px] ${className}`}
      >
        <Rail activeTab={editor.activeTab} onChange={editor.setActiveTab} />
        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <LeftPanel
              activeTab={editor.activeTab}
              template={editor.template}
              selectedLayerId={editor.selectedLayerId}
              onAddText={editor.addTextLayer}
              onAddTextOnPath={editor.addTextOnPathLayer}
              onAddShape={editor.addImageShape}
              onAddPolygon={editor.addPolygon}
              onDrawShape={editor.startDrawMode}
              onSelectLayer={editor.setSelectedLayerId}
              onUpdateTemplate={editor.updateTemplate}
              onUpdateField={editor.updateField}
              onDelete={editor.deleteSelectedLayer}
              onUploadBackground={onUploadBackground}
              embeddedBackgrounds={embeddedBackgrounds}
            />
          </div>
          <div className="border-r border-t border-ui-border-base bg-ui-bg-base p-4">
            <Button
              type="button"
              variant="secondary"
              className="w-full justify-center"
              onClick={() => editor.setPreviewOpen(true)}
            >
              <Eye className="mr-2 size-4" />
              Preview
            </Button>
          </div>
        </div>
        <EditorCanvas
          template={editor.template}
          selectedLayerId={editor.selectedLayerId}
          pathEditingLayerId={editor.pathEditingLayerId}
          selectedVectorPointId={editor.selectedVectorPointId}
          isDrawing={editor.isDrawing}
          pendingVectorPoints={editor.pendingVectorPoints}
          dynamicFonts={dynamicFonts}
          onSelectLayer={editor.setSelectedLayerId}
          onPathEditingLayerChange={editor.setPathEditingLayerId}
          onSelectVectorPoint={editor.setSelectedVectorPointId}
          onUpdateLayer={editor.updateLayer}
          onUploadBackground={onUploadBackground}
          onAddVectorPoint={editor.addVectorPoint}
          onUndoVectorPoint={editor.undoVectorPoint}
          onCloseVectorShape={editor.closeVectorShape}
          onCancelDraw={editor.cancelDrawMode}
          onDeleteLayer={editor.deleteSelectedLayer}
        />
        <div className="min-h-0 overflow-y-auto overflow-x-hidden">
          <Inspector
            template={editor.template}
            selectedLayer={editor.selectedLayer}
            pathEditingLayerId={editor.pathEditingLayerId}
            selectedVectorPointId={editor.selectedVectorPointId}
            onUpdateLayer={editor.updateLayer}
            onPathEditingLayerChange={editor.setPathEditingLayerId}
            onUpdateTemplate={editor.updateTemplate}
            onSelectVectorPoint={editor.setSelectedVectorPointId}
          />
        </div>
      </div>
      {editor.previewOpen ? (
        <PreviewDialog
          template={editor.template}
          values={editor.previewValues}
          dynamicFonts={dynamicFonts}
          pendingPdfFile={pendingPdfFile}
          onChange={editor.handlePreviewChange}
          onReset={editor.resetPreviewValues}
          onClose={() => editor.setPreviewOpen(false)}
        />
      ) : null}
    </>
  );
}
