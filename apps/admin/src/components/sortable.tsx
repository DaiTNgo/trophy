import { createContext, useContext, useEffect, useRef, useState, type RefObject } from "react";
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
import { GripVertical } from "lucide-react";

const SortableHandleContext = createContext<RefObject<HTMLButtonElement | null> | null>(null);

/**
 * Wires one row of a vertical drag-and-drop list. Rows only accept drops from the same
 * `kind`, and the drop indicator is hidden where dropping would not move the item.
 */
function useSortableItem({
  id,
  kind,
  items,
  onReorder,
  scrollContainer,
}: {
  id: string;
  kind: string;
  items: { id: string }[];
  onReorder: (sourceId: string, targetId: string, closestEdge: Edge | null) => void;
  scrollContainer?: RefObject<HTMLElement | null> | null;
}) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const dragHandleRef = useRef<HTMLButtonElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    const dragHandle = dragHandleRef.current;
    const scrollElement = scrollContainer?.current;
    if (!element || !dragHandle) return;

    const data = { kind, itemId: id };

    function onChange({ source, self }: any) {
      if (source.data.kind !== kind || typeof source.data.itemId !== "string") return;

      const edge = extractClosestEdge(self.data);
      if (!edge) return;

      const sourceIndex = items.findIndex((item) => item.id === source.data.itemId);
      const index = items.findIndex((item) => item.id === id);

      const isItemBeforeSource = index === sourceIndex - 1;
      const isItemAfterSource = index === sourceIndex + 1;

      const isDropIndicatorHidden =
        (isItemBeforeSource && edge === "bottom") ||
        (isItemAfterSource && edge === "top");

      setClosestEdge(isDropIndicatorHidden ? null : edge);
    }

    return combine(
      scrollElement
        ? autoScrollForElements({
            element: scrollElement,
            canScroll: ({ source }: any) => source.data.kind === kind,
            getAllowedAxis: () => "vertical",
          })
        : () => {},
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
          source.data.kind === kind && source.data.itemId !== id,
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
          if (source.data.kind !== kind || typeof source.data.itemId !== "string") return;
          onReorder(source.data.itemId, id, extractClosestEdge(self.data));
        },
      }),
    );
  }, [id, kind, items, onReorder, scrollContainer]);

  return { elementRef, dragHandleRef, isDragging, closestEdge };
}

/** Grip button that becomes the drag handle of the enclosing sortable row. */
function DragHandle({
  label,
  className,
  iconClassName,
}: {
  label: string;
  className: string;
  iconClassName: string;
}) {
  const handleRef = useContext(SortableHandleContext);
  return (
    <button ref={handleRef} type="button" aria-label={label} className={className}>
      <GripVertical className={iconClassName} />
    </button>
  );
}

/** Line with a dot marking where the dragged row will land; `offsetClassName` pushes it into the row gap. */
function SortableIndicator({
  edge,
  offsetClassName,
}: {
  edge: Edge;
  offsetClassName: { top: string; bottom: string };
}) {
  return (
    <div
      className={`pointer-events-none absolute left-0 right-0 z-50 flex items-center ${
        edge === "top" ? `${offsetClassName.top} -translate-y-1/2` : `${offsetClassName.bottom} translate-y-1/2`
      }`}
    >
      <div className="absolute -left-1 size-2 rounded-full border-[1.5px] border-ui-fg-interactive bg-ui-bg-base" />
      <div className="h-0.5 w-full bg-ui-fg-interactive" />
    </div>
  );
}

export {
  useSortableItem,
  SortableHandleContext,
  DragHandle,
  SortableIndicator,
  reorderWithEdge,
  autoScrollForElements,
};
export type { Edge };
