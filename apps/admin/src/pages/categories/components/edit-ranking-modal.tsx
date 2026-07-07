import { useEffect, useRef, useState } from "react";
import { FocusModal, Button } from "@medusajs/ui";
import { reorderWithEdge, autoScrollForElements } from "./sortable-list";
import type { Edge } from "./sortable-list";
import { RankingList } from "./ranking-list";

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
          <div className="w-full flex flex-col py-8 px-4">
            <RankingList items={orderedItems} onReorder={reorder} />
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  );
}
