import { ArrowLeft, Save } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import type { CustomizationTemplate } from "@trophy/customization";
import { useTemplateEditor } from "./hooks/useTemplateEditor";
import { EditorCanvas } from "./components/customization/customization-template-editor";
import { Inspector } from "./components/customization/customization-template-inspector";
import { LeftPanel, Rail } from "./components/customization/customization-template-panels";
import { PreviewDialog } from "./components/customization/customization-template-preview";

import { useBrandAssets } from "./hooks/use-brand-assets";

export default function CustomizationTemplatePage() {
  const [searchParams] = useSearchParams();
  const editParam = searchParams.get("edit");
  const { fonts } = useBrandAssets();
  const dynamicFonts = fonts.map(f => ({
    id: f.id,
    name: f.name,
    regularAssetId: (f as any).regularAssetId || null,
    boldAssetId: (f as any).boldAssetId || null,
    italicAssetId: (f as any).italicAssetId || null,
    boldItalicAssetId: (f as any).boldItalicAssetId || null,
  }));

  const {
    template,
    selectedLayerId,
    activeTab,
    flash,
    previewOpen,
    pathEditingLayerId,
    previewValues,
    deleted,
    selectedLayer,
    isDrawing,
    pendingVectorPoints,
    setSelectedLayerId,
    setActiveTab,
    setPreviewOpen,
    setPathEditingLayerId,
    updateTemplate,
    updateLayer,
    updateField,
    addTextLayer,
    addTextOnPathLayer,
    addImageShape,
    addPolygon,
    startDrawMode,
    cancelDrawMode,
    addVectorPoint,
    undoVectorPoint,
    closeVectorShape,
    deleteSelectedLayer,
    undoDelete,
    saveDraft,
    publish,
    updateBackground,
    handlePreviewChange,
    resetPreviewValues,
    pendingPdfFile,
  } = useTemplateEditor(editParam);

  return (
    <section className="flex h-[calc(100vh-96px)] flex-col overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-base shadow-sm">
      <EditorHeader template={template} onSave={() => void saveDraft()} onPublish={() => void publish()} onPreview={() => setPreviewOpen(true)} />
      {flash ? (
        <div className="flex items-center justify-between border-b border-ui-border-base bg-ui-bg-subtle px-4 py-2 text-sm text-ui-fg-subtle">
          <span>{flash}</span>
          {deleted ? (
            <button type="button" onClick={undoDelete} className="font-medium text-ui-fg-base">
              Undo
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="grid min-h-0 flex-1 grid-cols-[56px_280px_minmax(0,1fr)_320px]">
        <Rail activeTab={activeTab} onChange={setActiveTab} />
        <LeftPanel
          activeTab={activeTab}
          template={template}
          selectedLayerId={selectedLayerId}
          onAddText={addTextLayer}
          onAddTextOnPath={addTextOnPathLayer}
          onAddShape={addImageShape}
          onAddPolygon={addPolygon}
          onDrawShape={startDrawMode}
          onSelectLayer={setSelectedLayerId}
          onUpdateTemplate={updateTemplate}
          onUpdateField={updateField}
          onDelete={deleteSelectedLayer}
          onUploadBackground={updateBackground}
        />
        <EditorCanvas
          template={template}
          selectedLayerId={selectedLayerId}
          pathEditingLayerId={pathEditingLayerId}
          isDrawing={isDrawing}
          pendingVectorPoints={pendingVectorPoints}
          dynamicFonts={dynamicFonts}
          onSelectLayer={setSelectedLayerId}
          onPathEditingLayerChange={setPathEditingLayerId}
          onUpdateLayer={updateLayer}
          onUploadBackground={updateBackground}
          onAddVectorPoint={addVectorPoint}
          onUndoVectorPoint={undoVectorPoint}
          onCloseVectorShape={closeVectorShape}
          onCancelDraw={cancelDrawMode}
        />
        <Inspector
          template={template}
          selectedLayer={selectedLayer}
          pathEditingLayerId={pathEditingLayerId}
          onUpdateLayer={updateLayer}
          onPathEditingLayerChange={setPathEditingLayerId}
          onUpdateTemplate={updateTemplate}
        />
      </div>
      {previewOpen ? (
        <PreviewDialog
          template={template}
          values={previewValues}
          pendingPdfFile={pendingPdfFile}
          onChange={handlePreviewChange}
          onClose={() => setPreviewOpen(false)}
          onReset={resetPreviewValues}
        />
      ) : null}
    </section>
  );
}

function EditorHeader({
  template,
  onSave,
  onPublish,
  onPreview,
}: {
  template: CustomizationTemplate;
  onSave: () => void;
  onPublish: () => void;
  onPreview: () => void;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-ui-border-base px-4">
      <div className="flex items-center gap-3">
        <Link to="/customization-templates" className="rounded-md border border-ui-border-base p-2 text-ui-fg-subtle">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-sm font-medium text-ui-fg-base">{template.name}</p>
          <p className="text-xs text-ui-fg-muted">Product {template.productId} · Rev {template.revision} · {template.status}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onPreview} className="rounded-md border border-ui-border-base px-3 py-2 text-sm font-medium">
          Preview
        </button>
        <button type="button" onClick={onSave} className="inline-flex items-center gap-2 rounded-md border border-ui-border-base px-3 py-2 text-sm font-medium">
          <Save className="size-4" /> Save draft
        </button>
        <button type="button" onClick={onPublish} className="rounded-md bg-ui-bg-interactive px-3 py-2 text-sm font-medium text-ui-fg-on-color">
          Publish
        </button>
      </div>
    </header>
  );
}
