import { useState, useRef, useEffect } from "react";
import {
  Button,
  FocusModal,
  Heading,
  Input,
  Label,
  Text,
  Badge,
  Textarea,
  Select,
  ProgressTabs,
} from "@medusajs/ui";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { attachClosestEdge, extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { TagSolid } from "@medusajs/icons";
import { backendFetch } from "../../../lib/fetch";
import { useNavigate } from "react-router";

type CategoryItem = {
  id: string;
  name: string;
  isNew?: boolean;
};

// Reusable SortableItem component from EditRankingModal
function SortableItem({ item, index, moveItem }: { item: CategoryItem; index: number; moveItem: (dragIndex: number, hoverIndex: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<"top" | "bottom" | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return combine(
      draggable({
        element: el,
        getInitialData: () => ({ index, id: item.id }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element: el,
        getData: ({ input }) => attachClosestEdge(
          { index, id: item.id },
          { element: el, input, allowedEdges: ["top", "bottom"] }
        ),
        onDragEnter: (args) => setClosestEdge(extractClosestEdge(args.self.data) as "top" | "bottom" | null),
        onDrag: (args) => setClosestEdge(extractClosestEdge(args.self.data) as "top" | "bottom" | null),
        onDragLeave: () => setClosestEdge(null),
        onDrop: (args) => {
          setClosestEdge(null);
          const dragData = args.source.data as { index: number; id: string };
          if (dragData.index === index) return;
          const dropEdge = extractClosestEdge(args.self.data) as "top" | "bottom" | null;
          let targetIndex = index;
          if (dragData.index < index && dropEdge === "top") targetIndex--;
          if (dragData.index > index && dropEdge === "bottom") targetIndex++;
          moveItem(dragData.index, targetIndex);
        },
      })
    );
  }, [index, item.id, moveItem]);

  return (
    <div
      ref={ref}
      className={`relative flex items-center px-6 py-4 border-b border-ui-border-base bg-ui-bg-base cursor-grab active:cursor-grabbing hover:bg-ui-bg-base-hover transition-colors ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-x-4 w-full">
        <div className="text-ui-fg-muted">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 4.5C6 5.32843 5.32843 6 4.5 6C3.67157 6 3 5.32843 3 4.5C3 3.67157 3.67157 3 4.5 3C5.32843 3 6 3.67157 6 4.5ZM6 11.5C6 12.3284 5.32843 13 4.5 13C3.67157 13 3 12.3284 3 11.5C3 10.6716 3.67157 10 4.5 10C5.32843 10 6 10.6716 6 11.5ZM13 4.5C13 5.32843 12.3284 6 11.5 6C10.6716 6 10 5.32843 10 4.5C10 3.67157 10.6716 3 11.5 3C12.3284 3 13 3.67157 13 4.5ZM13 11.5C13 12.3284 12.3284 13 11.5 13C10.6716 13 10 12.3284 10 11.5C10 10.6716 10.6716 10 11.5 10C12.3284 10 13 10.6716 13 11.5Z" fill="currentColor"/>
          </svg>
        </div>
        <div className="flex items-center gap-x-3 flex-1">
          <div className="text-ui-fg-subtle">
            <TagSolid className="w-5 h-5 text-blue-500" />
          </div>
          <Text size="small" className="text-ui-fg-base flex items-center gap-x-2">
            {item.name}
            {item.isNew && (
              <Badge color="blue" size="small">New</Badge>
            )}
          </Text>
        </div>
      </div>
      {closestEdge === "top" && <div className="absolute top-0 left-0 right-0 h-0.5 bg-ui-bg-interactive" />}
      {closestEdge === "bottom" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-ui-bg-interactive" />}
    </div>
  );
}

interface CreateCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: { id: string; name: string }[];
  onSuccess: () => void;
}

export function CreateCategoryModal({ open, onOpenChange, categories, onSuccess }: CreateCategoryModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [orderedItems, setOrderedItems] = useState<CategoryItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setTitle("");
      setHandle("");
      setDescription("");
      setOrderedItems([...categories]);
    }
  }, [open, categories]);

  // Enable auto-scroll for drag-and-drop
  useEffect(() => {
    if (step === 2 && scrollRef.current) {
      return autoScrollForElements({ element: scrollRef.current });
    }
  }, [step]);

  const handleGoToStep2 = () => {
    if (!title.trim()) return;
    if (!orderedItems.find(i => i.id === "new-item")) {
      setOrderedItems([
        { id: "new-item", name: title, isNew: true },
        ...categories
      ]);
    } else {
      setOrderedItems(orderedItems.map(i => i.id === "new-item" ? { ...i, name: title } : i));
    }
    setStep(2);
  };

  const handleTabChange = (value: string) => {
    if (value === "1") setStep(1);
    if (value === "2") handleGoToStep2();
  };

  const moveItem = (dragIndex: number, hoverIndex: number) => {
    const draggedItem = orderedItems[dragIndex];
    if (!draggedItem) return;
    const newItems = [...orderedItems];
    newItems.splice(dragIndex, 1);
    newItems.splice(hoverIndex, 0, draggedItem);
    setOrderedItems(newItems);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      // 1. Create the new category
      const res = await backendFetch("/api/admin/product-metadata/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: title, 
          handle: handle || undefined,
          description: description || undefined 
        })
      });
      if (!res.ok) throw new Error("Failed to create category");
      const { item } = await res.json();
      const newCatId = item.id;

      // 2. Map orderedItems to new ranking, replacing 'new-item' with actual newCatId
      const newRanking = orderedItems.map((c, index) => ({
        id: c.id === "new-item" ? newCatId : Number(c.id),
        position: index
      }));

      // 3. Update ranking
      await backendFetch("/api/admin/product-metadata/categories/ranking", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: newRanking })
      });

      onSuccess();
      onOpenChange(false);
      navigate(`/categories/${newCatId}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <ProgressTabs
          value={step.toString()}
          onValueChange={handleTabChange}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <FocusModal.Header>
            <ProgressTabs.List className="-my-2 w-full border-l">
              <ProgressTabs.Trigger
                value="1"
                status={step === 1 ? "in-progress" : "completed"}
              >
                Details
              </ProgressTabs.Trigger>
              <ProgressTabs.Trigger
                value="2"
                status={step === 2 ? "in-progress" : "not-started"}
                disabled={step === 1 && !title.trim()}
              >
                Organize Ranking
              </ProgressTabs.Trigger>
            </ProgressTabs.List>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col h-full" ref={scrollRef}>
            <ProgressTabs.Content value="1" className="outline-none h-full">
              <div className="flex-1 flex flex-col items-center pt-16">
                <div className="w-full max-w-[720px] flex flex-col gap-y-8 px-8">
                <div className="flex flex-col gap-y-1">
                  <Heading level="h1">Create Category</Heading>
                  <Text size="small" className="text-ui-fg-subtle">
                    Create a new category to organize your products.
                  </Text>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="title" weight="plus">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="handle" weight="plus" className="flex items-center gap-x-1">
                      Handle <span className="text-ui-fg-muted font-normal">(Optional)</span>
                    </Label>
                    <div className="flex shadow-borders-base rounded-md overflow-hidden bg-ui-bg-field">
                      <div className="px-3 py-1.5 border-r border-ui-border-base flex items-center justify-center bg-ui-bg-subtle">
                        <Text size="small" className="text-ui-fg-muted">/</Text>
                      </div>
                      <input
                        id="handle"
                        className="flex-1 bg-transparent px-3 py-1.5 text-sm outline-none"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="description" weight="plus" className="flex items-center gap-x-1">
                    Description <span className="text-ui-fg-muted font-normal">(Optional)</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-y-2">
                    <Label weight="plus">Status</Label>
                    <Select value="active" disabled>
                      <Select.Trigger><Select.Value placeholder="Active" /></Select.Trigger>
                      <Select.Content><Select.Item value="active">Active</Select.Item></Select.Content>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-y-2">
                    <Label weight="plus">Visibility</Label>
                    <Select value="public" disabled>
                      <Select.Trigger><Select.Value placeholder="Public" /></Select.Trigger>
                      <Select.Content><Select.Item value="public">Public</Select.Item></Select.Content>
                    </Select>
                  </div>
                </div>
                </div>
              </div>
            </ProgressTabs.Content>
            <ProgressTabs.Content value="2" className="outline-none h-full">
              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col">
                  {orderedItems.map((item, index) => (
                    <SortableItem key={item.id} item={item} index={index} moveItem={moveItem} />
                  ))}
                </div>
              </div>
            </ProgressTabs.Content>
          </FocusModal.Body>
          <FocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <FocusModal.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </FocusModal.Close>
            {step === 1 ? (
              <Button onClick={handleGoToStep2} disabled={!title.trim()}>
                Continue
              </Button>
            ) : (
              <Button onClick={handleSave} isLoading={isSaving}>
                Save
              </Button>
            )}
          </div>
          </FocusModal.Footer>
        </ProgressTabs>
      </FocusModal.Content>
    </FocusModal>
  );
}
