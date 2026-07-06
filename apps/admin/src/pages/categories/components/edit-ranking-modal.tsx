import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { reorderWithEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { FocusModal, Button, Text } from "@medusajs/ui";
import { GripVertical, Tag } from "lucide-react";

export function EditRankingModal({
  open,
  onOpenChange,
  items,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: { id: string; name: string }[];
  onSave: (orderedItems: { id: string; name: string }[]) => void;
}) {
  const [orderedItems, setOrderedItems] = useState(items);
  const [isSaving, setIsSaving] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setOrderedItems(items);
  }, [open, items]);

  useEffect(() => {
    if (!open || !scrollContainerRef.current) return;
    return autoScrollForElements({
      element: scrollContainerRef.current,
    });
  }, [open, orderedItems.length]);

  function reorder(sourceId: string, targetId: string, closestEdge: Edge | null) {
    const from = orderedItems.findIndex((item) => item.id === sourceId);
    const to = orderedItems.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    
    const reordered = reorderWithEdge({
      list: orderedItems,
      startIndex: from,
      indexOfTarget: to,
      closestEdgeOfTarget: closestEdge,
      axis: "vertical",
    });
    
    if (reordered !== orderedItems) {
      setOrderedItems(reordered);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(orderedItems);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
            Save
          </Button>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center overflow-y-auto h-full" ref={scrollContainerRef}>
          <div className="w-full max-w-3xl flex flex-col py-8 px-4">
            <div className="flex flex-col border border-ui-border-base rounded-md overflow-hidden bg-ui-bg-base shadow-sm">
              {orderedItems.map((item, index) => (
                <SortableItem
                  key={item.id}
                  id={item.id}
                  items={orderedItems}
                  onReorder={reorder}
                  className={index !== orderedItems.length - 1 ? "border-b border-ui-border-base" : ""}
                >
                  <div className="flex items-center gap-x-4 bg-ui-bg-base px-4 py-3">
                    <DragHandle label={`Move ${item.name}`} />
                    <Tag className="h-4 w-4 text-ui-fg-subtle" />
                    <Text size="small">{item.name}</Text>
                  </div>
                </SortableItem>
              ))}
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  );
}

// Drag & Drop infrastructure
const SortableHandleContext = createContext<RefObject<HTMLButtonElement | null> | null>(null);

function SortableItem({
  id,
  items,
  children,
  onReorder,
  className,
}: {
  id: string;
  items: { id: string }[];
  children: ReactNode;
  onReorder: (sourceId: string, targetId: string, closestEdge: Edge | null) => void;
  className?: string;
}) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const dragHandleRef = useRef<HTMLButtonElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    const dragHandle = dragHandleRef.current;
    if (!element || !dragHandle) return;
    
    const data = { kind: "category-item", itemId: id };

    function onChange({ source, self }: any) {
      if (source.data.kind !== "category-item" || typeof source.data.itemId !== "string") return;
      
      const edge = extractClosestEdge(self.data);
      if (!edge) return;

      const sourceIndex = items.findIndex((item) => item.id === source.data.itemId);
      const index = items.findIndex((item) => item.id === id);
      
      const isItemBeforeSource = index === sourceIndex - 1;
      const isItemAfterSource = index === sourceIndex + 1;
      
      const isDropIndicatorHidden =
        (isItemBeforeSource && edge === "bottom") ||
        (isItemAfterSource && edge === "top");

      if (isDropIndicatorHidden) {
        setClosestEdge(null);
        return;
      }

      setClosestEdge(edge);
    }

    return combine(
      draggable({
        element,
        dragHandle,
        getInitialData: () => data,
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) =>
          source.data.kind === "category-item" && source.data.itemId !== id,
        getData: ({ input }) =>
          attachClosestEdge(data, {
            element,
            input,
            allowedEdges: ["top", "bottom"],
          }),
        onDragEnter: onChange,
        onDrag: onChange,
        onDragLeave: () => setClosestEdge(null),
        onDrop: ({ self, source }) => {
          setClosestEdge(null);
          if (
            source.data.kind !== "category-item" ||
            typeof source.data.itemId !== "string"
          )
            return;
          onReorder(source.data.itemId, id, extractClosestEdge(self.data));
        },
      }),
    );
  }, [id, items, onReorder]);

  return (
    <div
      ref={elementRef}
      className={`relative transition-opacity duration-200 ${isDragging ? "opacity-40 bg-ui-bg-subtle" : ""} ${className || ""}`}
    >
      {closestEdge ? <SortableIndicator edge={closestEdge} /> : null}
      <SortableHandleContext.Provider value={dragHandleRef}>
        {children}
      </SortableHandleContext.Provider>
    </div>
  );
}

function DragHandle({ label }: { label: string }) {
  const handleRef = useContext(SortableHandleContext);
  return (
    <button
      ref={handleRef}
      type="button"
      aria-label={label}
      className="cursor-grab p-1 text-ui-fg-muted active:cursor-grabbing hover:bg-ui-bg-subtle rounded-md"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

function SortableIndicator({ edge }: { edge: Edge }) {
  const isTop = edge === "top";
  return (
    <div
      className={`pointer-events-none absolute left-0 right-0 z-50 flex items-center ${
        isTop ? "-top-[1px] -translate-y-1/2" : "-bottom-[1px] translate-y-1/2"
      }`}
    >
      <div className="absolute -left-1 h-2 w-2 rounded-full border-[1.5px] border-ui-fg-interactive bg-ui-bg-base" />
      <div className="h-0.5 w-full bg-ui-fg-interactive" />
    </div>
  );
}
