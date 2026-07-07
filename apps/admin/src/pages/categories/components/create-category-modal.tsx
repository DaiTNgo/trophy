import { useState, useRef, useEffect } from "react";
import {
  Button,
  FocusModal,
  Heading,
  Label,
  Text,
  Select,
  ProgressTabs,
} from "@medusajs/ui";
import { LocalizedTextField, createEmptyLocalizedText, type AdminLocale, type LocalizedTextValue } from "../../../components/ui/medusa";
import { backendFetch } from "../../../lib/fetch";
import { useNavigate } from "react-router";
import { reorderWithEdge, autoScrollForElements } from "./sortable-list";
import type { Edge } from "./sortable-list";
import { RankingList } from "./ranking-list";

type CategoryItem = {
  id: string;
  name: string;
  isNew?: boolean;
};

interface CreateCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: { id: string; name: string }[];
  onSuccess: () => void;
}

export function CreateCategoryModal({ open, onOpenChange, categories, onSuccess }: CreateCategoryModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState<LocalizedTextValue>(() => createEmptyLocalizedText());
  const [titleLocale, setTitleLocale] = useState<AdminLocale>("vi");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState<LocalizedTextValue>(() => createEmptyLocalizedText());
  const [descriptionLocale, setDescriptionLocale] = useState<AdminLocale>("vi");
  const [isSaving, setIsSaving] = useState(false);
  const [orderedItems, setOrderedItems] = useState<CategoryItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setStep(1);
      setTitle(createEmptyLocalizedText());
      setTitleLocale("vi");
      setHandle("");
      setDescription(createEmptyLocalizedText());
      setDescriptionLocale("vi");
      setOrderedItems([...categories]);
    }
  }, [open, categories]);

  useEffect(() => {
    if (step === 2 && scrollRef.current) {
      return autoScrollForElements({ element: scrollRef.current });
    }
  }, [step]);

  const handleGoToStep2 = () => {
    if (!title.vi.trim()) return;
    if (!orderedItems.find(i => i.id === "new-item")) {
      setOrderedItems([
        { id: "new-item", name: title.vi, isNew: true },
        ...categories
      ]);
    } else {
      setOrderedItems(orderedItems.map(i => i.id === "new-item" ? { ...i, name: title.vi } : i));
    }
    setStep(2);
  };

  const handleTabChange = (value: string) => {
    if (value === "1") setStep(1);
    if (value === "2") handleGoToStep2();
  };

  function reorder(sourceId: string, targetId: string, closestEdge: Edge | null) {
    setOrderedItems((prev) => {
      const from = prev.findIndex((item) => item.id === sourceId);
      const to = prev.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0) return prev;

      const reordered = reorderWithEdge({
        list: prev,
        startIndex: from,
        indexOfTarget: to,
        closestEdgeOfTarget: closestEdge,
        axis: "vertical",
      });

      return reordered !== prev ? reordered : prev;
    });
  }

  const handleSave = async () => {
    if (!title.vi.trim()) return;
    setIsSaving(true);
    try {
      const res = await backendFetch("/api/admin/product-metadata/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: { vi: title.vi, en: title.en || undefined }, 
          handle: handle || undefined,
          description: description.vi ? { vi: description.vi, en: description.en || undefined } : undefined
        })
      });
      if (!res.ok) throw new Error("Failed to create category");
      const { item } = await res.json();
      const newCatId = item.id;

      const newRanking = orderedItems.map((c, index) => ({
        id: c.id === "new-item" ? newCatId : Number(c.id),
        position: index
      }));

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
                disabled={step === 1 && !title.vi.trim()}
              >
                Organize Ranking
              </ProgressTabs.Trigger>
            </ProgressTabs.List>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col flex-1 min-h-0 overflow-y-auto" ref={scrollRef}>
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
                    <LocalizedTextField
                      id="title"
                      label="Title"
                      value={title}
                      locale={titleLocale}
                      onLocaleChange={setTitleLocale}
                      onChange={setTitle}
                      placeholder={{ vi: "Tieu de", en: "Title" }}
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
                  <LocalizedTextField
                    id="description"
                    label="Description (Optional)"
                    value={description}
                    locale={descriptionLocale}
                    onLocaleChange={setDescriptionLocale}
                    onChange={setDescription}
                    placeholder={{ vi: "Mo ta", en: "Description" }}
                    multiline
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
            <ProgressTabs.Content value="2" className="outline-none">
              <div className="w-full flex flex-col py-8 px-4">
                <RankingList items={orderedItems} onReorder={reorder} />
              </div>
            </ProgressTabs.Content>
          </FocusModal.Body>
          <FocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <FocusModal.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </FocusModal.Close>
            {step === 1 ? (
              <Button onClick={handleGoToStep2} disabled={!title.vi.trim()}>
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
