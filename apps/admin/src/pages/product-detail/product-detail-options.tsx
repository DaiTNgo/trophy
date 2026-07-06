import { useState } from "react";
import { Badge, Button, Container, Drawer, IconButton, Input, Label, Heading, Text, DropdownMenu } from "@medusajs/ui";
import { MoreHorizontal, Plus, Trash } from "lucide-react";
import { InlineError } from "../../components/ui/medusa/inline-error";
import {
  createProductOption,
  createProductOptionValue,
  deleteProductOption,
  deleteProductOptionValue,
  updateProductOption,
  updateProductOptionValue,
} from "../../lib/products-client";
import type { CatalogProduct } from "../../types";

type ProductDetailOptionsProps = {
  product: CatalogProduct;
  mutate: () => Promise<void>;
};

type OptionDraft = {
  id: number | null;
  title: string;
  values: Array<{ id: number | null; value: string }>;
};

function buildOptionDrafts(product: CatalogProduct): OptionDraft[] {
  return product.optionDefinitions.map((option) => ({
    id: Number(option.id),
    title: option.title,
    values: option.values.map((value) => ({
      id: Number(value.id),
      value: value.value,
    })),
  }));
}

export function ProductDetailOptions({ product, mutate }: ProductDetailOptionsProps) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [optionsDrafts, setOptionsDrafts] = useState<OptionDraft[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [isSavingOptions, setIsSavingOptions] = useState(false);

  function openOptions() {
    setOptionsDrafts(buildOptionDrafts(product));
    setOptionsError(null);
    setOptionsOpen(true);
  }

  async function saveOptions() {
    setIsSavingOptions(true);
    setOptionsError(null);

    try {
      const snapshot = buildOptionDrafts(product);
      const nextDrafts = optionsDrafts
        .map((option) => ({
          ...option,
          title: option.title.trim(),
          values: option.values
            .map((value) => ({ ...value, value: value.value.trim() }))
            .filter((value) => value.value !== ""),
        }))
        .filter((option) => option.title !== "");

      const removedOptionIds = snapshot
        .filter((option) => !nextDrafts.some((draft) => draft.id === option.id))
        .map((option) => option.id!)
        .filter(Boolean);

      for (const optionId of removedOptionIds) {
        await deleteProductOption(product.id, optionId);
      }

      const existingDrafts = nextDrafts.filter((option) => option.id !== null);
      for (const draft of existingDrafts) {
        const original = snapshot.find((option) => option.id === draft.id);
        if (!original) {
          continue;
        }

        if (original.title !== draft.title) {
          await updateProductOption(product.id, draft.id!, { title: draft.title });
        }

        const removedValueIds = original.values
          .filter((value) => !draft.values.some((draftValue) => draftValue.id === value.id))
          .map((value) => value.id!)
          .filter(Boolean);

        for (const valueId of removedValueIds) {
          await deleteProductOptionValue(product.id, valueId);
        }

        for (const valueDraft of draft.values.filter((value) => value.id !== null)) {
          const originalValue = original.values.find((value) => value.id === valueDraft.id);
          if (originalValue && originalValue.value !== valueDraft.value) {
            await updateProductOptionValue(product.id, valueDraft.id!, { value: valueDraft.value });
          }
        }

        for (const valueDraft of draft.values.filter((value) => value.id === null)) {
          await createProductOptionValue(product.id, draft.id!, { value: valueDraft.value });
        }
      }

      for (const draft of nextDrafts.filter((option) => option.id === null)) {
        await createProductOption(product.id, {
          title: draft.title,
          values: draft.values.map((value) => value.value),
        });
      }

      await mutate();
      setOptionsOpen(false);
    } catch (error) {
      setOptionsError(error instanceof Error ? error.message : "Failed to save option changes.");
    } finally {
      setIsSavingOptions(false);
    }
  }

  return (
    <Container className="p-0 overflow-hidden">
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2" className="text-xl font-semibold">Options</Heading>
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <IconButton variant="transparent" size="small">
                <MoreHorizontal className="h-4 w-4 text-ui-fg-muted" />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
              <DropdownMenu.Item onClick={openOptions}>
                Edit Options
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>

        {product.optionDefinitions.length === 0 ? (
          <div className="border-t border-ui-border-base px-6 py-4 flex items-center justify-center">
            <Text size="small" className="text-ui-fg-subtle">No options defined</Text>
          </div>
        ) : (
          <div className="flex flex-col">
            {product.optionDefinitions.map((option) => (
              <div key={option.id} className="flex items-center justify-between border-t border-ui-border-base px-6 py-4">
                <Text size="small" className="text-ui-fg-base">{option.title}</Text>
                <div className="flex items-center gap-x-2">
                  <div className="flex flex-wrap gap-1">
                    {option.values.map((val) => (
                      <Badge key={val.id} size="small" rounded="base" color="grey">
                        {val.value}
                      </Badge>
                    ))}
                  </div>
                  <DropdownMenu>
                    <DropdownMenu.Trigger asChild>
                      <IconButton variant="transparent" size="small">
                        <MoreHorizontal className="h-4 w-4 text-ui-fg-muted" />
                      </IconButton>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end">
                      <DropdownMenu.Item onClick={openOptions}>
                        Edit Options
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Drawer open={optionsOpen} onOpenChange={setOptionsOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Manage options</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-y-6 overflow-y-auto">
            {optionsError && <InlineError message={optionsError} />}
            {optionsDrafts.map((option, optionIndex) => (
              <div key={`${option.id ?? "new"}-${optionIndex}`} className="rounded-lg border border-ui-border-base p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-3">
                    <div className="space-y-1.5">
                      <Label size="small">Option title</Label>
                      <Input
                        value={option.title}
                        onChange={(event) =>
                          setOptionsDrafts((current) =>
                            current.map((item, currentIndex) =>
                              currentIndex === optionIndex ? { ...item, title: event.target.value } : item,
                            ),
                          )
                        }
                        placeholder="Color"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label size="small">Values</Label>
                      {option.values.map((value, valueIndex) => (
                        <div key={`${value.id ?? "new"}-${valueIndex}`} className="flex gap-2">
                          <Input
                            value={value.value}
                            onChange={(event) =>
                              setOptionsDrafts((current) =>
                                current.map((item, currentIndex) =>
                                  currentIndex === optionIndex
                                    ? {
                                        ...item,
                                        values: item.values.map((innerValue, innerIndex) =>
                                          innerIndex === valueIndex
                                            ? { ...innerValue, value: event.target.value }
                                            : innerValue,
                                        ),
                                      }
                                    : item,
                                ),
                              )
                            }
                            placeholder="Red"
                          />
                          <IconButton
                            type="button"
                            variant="transparent"
                            onClick={() =>
                              setOptionsDrafts((current) =>
                                current.map((item, currentIndex) =>
                                  currentIndex === optionIndex
                                    ? {
                                        ...item,
                                        values: item.values.filter((_, innerIndex) => innerIndex !== valueIndex),
                                      }
                                    : item,
                                ),
                              )
                            }
                          >
                            <Trash className="h-4 w-4 text-ui-fg-error" />
                          </IconButton>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        onClick={() =>
                          setOptionsDrafts((current) =>
                            current.map((item, currentIndex) =>
                              currentIndex === optionIndex
                                ? { ...item, values: [...item.values, { id: null, value: "" }] }
                                : item,
                            ),
                          )
                        }
                      >
                        <Plus className="h-4 w-4" />
                        Add value
                      </Button>
                    </div>
                  </div>
                  <IconButton
                    type="button"
                    variant="transparent"
                    onClick={() =>
                      setOptionsDrafts((current) => current.filter((_, currentIndex) => currentIndex !== optionIndex))
                    }
                  >
                    <Trash className="h-4 w-4 text-ui-fg-error" />
                  </IconButton>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setOptionsDrafts((current) => [...current, { id: null, title: "", values: [] }])
              }
            >
              <Plus className="h-4 w-4" />
              Add option
            </Button>
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button variant="secondary" disabled={isSavingOptions}>
                Cancel
              </Button>
            </Drawer.Close>
            <Button onClick={() => void saveOptions()} isLoading={isSavingOptions}>
              Save option changes
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  );
}
