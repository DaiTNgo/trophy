import type { ReactNode } from "react";
import {
  DragHandle as BaseDragHandle,
  SortableHandleContext,
  SortableIndicator,
  useSortableItem,
  reorderWithEdge,
  autoScrollForElements,
  type Edge,
} from "../../../components/sortable";

const INDICATOR_OFFSET = { top: "-top-[1px]", bottom: "-bottom-[1px]" };

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
  const { elementRef, dragHandleRef, isDragging, closestEdge } = useSortableItem({
    id,
    kind: "sortable-item",
    items,
    onReorder,
  });

  return (
    <div
      ref={elementRef}
      className={`relative transition-opacity duration-200 ${isDragging ? "opacity-40 bg-ui-bg-subtle" : ""} ${className || ""}`}
    >
      {closestEdge ? <SortableIndicator edge={closestEdge} offsetClassName={INDICATOR_OFFSET} /> : null}
      <SortableHandleContext.Provider value={dragHandleRef}>
        {children}
      </SortableHandleContext.Provider>
    </div>
  );
}

function DragHandle({ label }: { label: string }) {
  return (
    <BaseDragHandle
      label={label}
      className="cursor-grab p-1 text-ui-fg-muted active:cursor-grabbing hover:bg-ui-bg-subtle rounded-md"
      iconClassName="h-4 w-4"
    />
  );
}

export { SortableItem, DragHandle, reorderWithEdge, autoScrollForElements };
export type { Edge };
