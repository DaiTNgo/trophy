import {
  FileImage,
  Layers,
  PanelRight,
  Plus,
} from "lucide-react";
import { useRef } from "react";
import {
  type CustomizationFormField,
  type CustomizationTemplate,
  type ShapeType,
} from "@trophy/customization";
import { type RailTab } from "./customization-template-ui";
import {
  BackgroundPanel,
  BlocksPanel,
  EmbeddedBackgroundPanel,
  FormPanel,
  LayersPanel,
  SortableScrollContainerContext,
} from "./customization-template-panel-sections";

export function Rail({
  activeTab,
  onChange,
}: {
  activeTab: RailTab;
  onChange: (tab: RailTab) => void;
}) {
  const items = [
    { id: "blocks", label: "Blocks", icon: Plus },
    { id: "layers", label: "Layers", icon: Layers },
    { id: "form", label: "Form", icon: PanelRight },
    { id: "background", label: "Background", icon: FileImage },
  ] as const;
  return (
    <nav className="flex flex-col items-center gap-2 border-r border-ui-border-base bg-ui-bg-subtle py-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            onClick={() => onChange(item.id)}
            className={`rounded-md p-3 ${activeTab === item.id ? "bg-ui-bg-base text-ui-fg-base shadow-sm" : "text-ui-fg-muted"}`}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </nav>
  );
}

export function LeftPanel(props: {
  activeTab: RailTab;
  template: CustomizationTemplate;
  selectedLayerId: string;
  onAddText: () => void;
  onAddTextOnPath: () => void;
  onAddShape: (shape: ShapeType) => void;
  onAddPolygon: () => void;
  onDrawShape: () => void;
  onSelectLayer: (layerId: string) => void;
  onUpdateTemplate: (
    updater: (current: CustomizationTemplate) => CustomizationTemplate,
  ) => void;
  onUpdateField: (
    fieldId: string,
    updater: (field: CustomizationFormField) => CustomizationFormField,
  ) => void;
  onDelete: (id?: string) => void;
  onUploadBackground: (
    background: import("@trophy/customization").BackgroundAsset,
    file?: File,
  ) => void;
  embeddedBackgrounds?: {
    items: Array<import("@trophy/customization").BackgroundAsset>;
    selectedAssetId: string | null;
    onSelectAssetId: (assetId: string) => void;
  };
}) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  return (
    <SortableScrollContainerContext.Provider value={scrollContainerRef}>
    <aside ref={scrollContainerRef} className="overflow-y-auto overflow-x-hidden border-r border-ui-border-base p-4">
      {props.activeTab === "blocks" ? (
        <BlocksPanel
          template={props.template}
          onAddText={props.onAddText}
          onAddTextOnPath={props.onAddTextOnPath}
          onAddShape={props.onAddShape}
          onAddPolygon={props.onAddPolygon}
        />
      ) : null}
      {props.activeTab === "layers" ? (
        <LayersPanel
          template={props.template}
          selectedLayerId={props.selectedLayerId}
          onSelectLayer={props.onSelectLayer}
          onUpdateTemplate={props.onUpdateTemplate}
          onDelete={props.onDelete}
        />
      ) : null}
      {props.activeTab === "form" ? (
        <FormPanel
          template={props.template}
          selectedLayerId={props.selectedLayerId}
          onSelectLayer={props.onSelectLayer}
          onUpdateField={props.onUpdateField}
          onUpdateTemplate={props.onUpdateTemplate}
        />
      ) : null}
      {props.activeTab === "background" ? (
        props.embeddedBackgrounds ? (
          <EmbeddedBackgroundPanel
            template={props.template}
            items={props.embeddedBackgrounds.items}
            selectedAssetId={props.embeddedBackgrounds.selectedAssetId}
            onSelectAssetId={props.embeddedBackgrounds.onSelectAssetId}
          />
        ) : (
          <BackgroundPanel
            template={props.template}
            onUpdateTemplate={props.onUpdateTemplate}
            onUploadBackground={props.onUploadBackground}
          />
        )
      ) : null}
    </aside>
    </SortableScrollContainerContext.Provider>
  );
}
