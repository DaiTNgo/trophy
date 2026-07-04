import { ArrowLeft, Save } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { Button, FocusModal } from "@medusajs/ui";
import { useProductCustomizationEditor } from "../hooks/useProductCustomizationEditor";
import { EditorCanvas } from "../components/customization/customization-template-editor";
import { Inspector } from "../components/customization/customization-template-inspector";
import { LeftPanel, Rail } from "../components/customization/customization-template-panels";
import { PreviewDialog } from "../components/customization/customization-template-preview";
import { useBrandAssets } from "../hooks/use-brand-assets";
import { useProductDetail } from "./product-detail/use-product-detail";
import { updateProductCustomization } from "../lib/products-client";
import { useState } from "react";

export function ProductCustomizationEditor() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { product, isLoading, error, mutate } = useProductDetail();
  const { fonts } = useBrandAssets();
  const [isSaving, setIsSaving] = useState(false);

  const dynamicFonts = fonts.map(f => ({
    id: f.id,
    name: f.name,
    regularAssetId: (f as any).regularAssetId || null,
    boldAssetId: (f as any).boldAssetId || null,
    italicAssetId: (f as any).italicAssetId || null,
    boldItalicAssetId: (f as any).boldItalicAssetId || null,
  }));

  const saveCustomization = async (customization: any) => {
    if (!productId) return;
    setIsSaving(true);
    try {
      await updateProductCustomization(productId, customization);
      await mutate();
    } finally {
      setIsSaving(false);
    }
  };

  const editor = useProductCustomizationEditor(
    productId || "",
    product?.customization,
    saveCustomization
  );

  const {
    template,
    selectedLayerId,
    activeTab,
    flash,
    previewOpen,
    pathEditingLayerId,
    previewValues,
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
    saveDraft,
    updateBackground,
    handlePreviewChange,
    resetPreviewValues,
  } = editor;

  if (isLoading) {
    return (
      <FocusModal open={true}>
        <FocusModal.Content>
          <div className="flex h-full items-center justify-center">Loading editor...</div>
        </FocusModal.Content>
      </FocusModal>
    );
  }

  if (error || !product) {
    return (
      <FocusModal open={true}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Button variant="secondary" onClick={() => navigate(-1)}>Close</Button>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col items-center justify-center">
            <p>Error: {error || "Product not found"}</p>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    );
  }

  return (
    <FocusModal open={true} onOpenChange={(open) => { if (!open) navigate(`/products/${product.id}`); }}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-x-4">
              <Button variant="secondary" size="small" onClick={() => navigate(`/products/${product.id}`)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Product
              </Button>
              <h2 className="text-sm font-medium">Customization Editor: {product.title}</h2>
            </div>
            <div className="flex items-center gap-x-2">
              <span className="text-ui-fg-subtle text-xs">{flash}</span>
              <Button variant="secondary" size="small" onClick={() => setPreviewOpen(true)}>
                Preview
              </Button>
              <Button variant="primary" size="small" onClick={() => void saveDraft()} isLoading={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                Save & Close
              </Button>
            </div>
          </div>
        </FocusModal.Header>
        <FocusModal.Body className="flex h-[calc(100vh-64px)] flex-col overflow-hidden bg-ui-bg-base">
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
              onUpdateLayer={updateLayer}
              onAddVectorPoint={addVectorPoint}
              onCloseVectorShape={closeVectorShape}
              onCancelDraw={cancelDrawMode}
              onUndoVectorPoint={undoVectorPoint}
              onPathEditingLayerChange={setPathEditingLayerId}
              onUploadBackground={updateBackground}
            />
            <Inspector
              template={template}
              selectedLayer={selectedLayer || null}
              pathEditingLayerId={pathEditingLayerId}
              onUpdateLayer={updateLayer}
              onPathEditingLayerChange={setPathEditingLayerId}
              onUpdateTemplate={updateTemplate}
            />
          </div>
          {previewOpen && (
            <PreviewDialog
              template={template}
              values={previewValues}
              onChange={handlePreviewChange}
              onReset={resetPreviewValues}
              onClose={() => setPreviewOpen(false)}
            />
          )}
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  );
}
