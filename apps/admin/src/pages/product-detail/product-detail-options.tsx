import { useState } from "react";
import { Badge, Button, Container, Drawer, IconButton, Heading, Text, DropdownMenu, toast } from "@medusajs/ui";
import { MoreHorizontal } from "lucide-react";
import {
  createLocalizedText,
} from "../../components/ui/medusa";
import {
  createProductOption,
  deleteProductOption,
  updateProductOptionBulk,
} from "../../lib/products-client";
import { ProductOptionEditor } from "../../components/product/ProductOptionEditor";
import type { CatalogProduct, AdminLocale, OptionDraft } from "../../types";

type ProductDetailOptionsProps = {
  product: CatalogProduct;
  mutate: () => Promise<void>;
};


export function ProductDetailOptions({ product, mutate }: ProductDetailOptionsProps) {
  const [activeOption, setActiveOption] = useState<OptionDraft | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [optionTitleLocale, setOptionTitleLocale] = useState<AdminLocale>("vi");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});

  function openEditOption(option: CatalogProduct["optionDefinitions"][number]) {
    const titleTranslations = option.titleTranslations ?? createLocalizedText(option.title);
    const displayType = option.displayType ?? "text";
    setActiveOption({
      id: Number(option.id),
      titleTranslations,
      displayType,
      values: option.values.map((v) => ({
        id: Number(v.id),
        valueTranslations: v.valueTranslations ?? createLocalizedText(v.value),
        colorHex: v.colorHex ?? null,
        swatchAssetId: v.swatchAssetId ?? null,
        swatchAssetUrl: v.swatchAssetUrl ?? null,
      })),
    });
    setModalOpen(true);
  }

  function openAddOption() {
    setActiveOption({
      id: null,
      titleTranslations: createLocalizedText(""),
      displayType: "text",
      values: [],
    });
    setModalOpen(true);
  }

  async function handleDeleteOption(optionId: string) {
    if (
      !confirm(
        "Are you sure you want to delete this option? This will delete all of its values and may affect variants."
      )
    ) {
      return;
    }
    setIsDeleting((curr) => ({ ...curr, [optionId]: true }));
    try {
      await deleteProductOption(product.id, Number(optionId));
      await mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete option.");
    } finally {
      setIsDeleting((curr) => ({ ...curr, [optionId]: false }));
    }
  }

  async function handleSaveOption() {
    if (!activeOption) return;
    setIsSaving(true);

    const trimmedTitleVi = activeOption.titleTranslations.vi.trim();
    const trimmedTitleEn = activeOption.titleTranslations.en.trim();
    if (!trimmedTitleVi) {
      const message = "Vietnamese option title is required.";
      toast.error("Option could not be saved", {
        description: `${message} Enter a Vietnamese option title and at least one value, then try again.`,
      });
      setIsSaving(false);
      return;
    }

    const finalValues = activeOption.values;

    if (finalValues.length === 0) {
      const message = "At least one variation value is required.";
      toast.error("Option could not be saved", {
        description: `${message} Add at least one variation value, then try again.`,
      });
      setIsSaving(false);
      return;
    }

    try {
      if (activeOption.id === null) {
        // Creating a new option
        await createProductOption(product.id, {
          title: { vi: trimmedTitleVi, en: trimmedTitleEn },
          displayType: activeOption.displayType,
          values: finalValues.map((v) => ({
            value: {
              vi: v.valueTranslations.vi.trim(),
              en: v.valueTranslations.en.trim(),
            },
            colorHex: v.colorHex ?? null,
            swatchAssetId: v.swatchAssetId ?? null,
          })),
        });
      } else {
        // Updating an existing option using the bulk endpoint
        const optionId = activeOption.id;
        await updateProductOptionBulk(product.id, Number(optionId), {
          title: { vi: trimmedTitleVi, en: trimmedTitleEn },
          displayType: activeOption.displayType,
          values: finalValues.map((v) => ({
            id: v.id ? Number(v.id) : null,
            value: { vi: v.valueTranslations.vi.trim(), en: v.valueTranslations.en.trim() },
            colorHex: v.colorHex ?? null,
            swatchAssetId: v.swatchAssetId ?? null,
          })),
        });
      }

      setModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save option.");
    } finally {
      setIsSaving(false);
      await mutate();
    }
  }

  return (
    <Container className="p-0 overflow-hidden">
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2" className="text-xl font-semibold">
            Options
          </Heading>
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <IconButton variant="transparent" size="small">
                <MoreHorizontal className="h-4 w-4 text-ui-fg-muted" />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
              <DropdownMenu.Item onClick={openAddOption}>Add Option</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>

        {product.optionDefinitions.length === 0 ? (
          <div className="border-t border-ui-border-base px-6 py-4 flex items-center justify-center">
            <Text size="small" className="text-ui-fg-subtle">
              No options defined
            </Text>
          </div>
        ) : (
          <div className="flex flex-col">
            {product.optionDefinitions.map((option) => (
              <div
                key={option.id}
                className="flex items-center justify-between border-t border-ui-border-base px-6 py-4"
              >
                <Text size="small" className="text-ui-fg-base">
                  {option.title}
                </Text>
                <div className="flex items-center gap-x-2">
                  <div className="flex flex-wrap gap-1">
                    {option.values.map((val) => (
                      <Badge
                        key={val.id}
                        size="small"
                        rounded="base"
                        color="grey"
                        className="inline-flex items-center gap-1.5"
                      >
                        {option.displayType === "color" && val.colorHex ? (
                          <span
                            className="size-2.5 rounded-full border border-ui-border-base shrink-0"
                            style={{ backgroundColor: val.colorHex }}
                          />
                        ) : option.displayType === "image" && val.swatchAssetUrl ? (
                          <img
                            src={val.swatchAssetUrl}
                            alt=""
                            className="size-3.5 rounded object-cover shrink-0"
                          />
                        ) : null}
                        {val.value}
                      </Badge>
                    ))}
                  </div>
                  <DropdownMenu>
                    <DropdownMenu.Trigger asChild>
                      <IconButton
                        variant="transparent"
                        size="small"
                        disabled={isDeleting[option.id]}
                      >
                        <MoreHorizontal className="h-4 w-4 text-ui-fg-muted" />
                      </IconButton>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end">
                      <DropdownMenu.Item onClick={() => openEditOption(option)}>
                        Edit Option
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onClick={() => void handleDeleteOption(option.id)}
                        className="text-ui-fg-error"
                      >
                        Delete Option
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Drawer open={modalOpen} onOpenChange={setModalOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>
              {activeOption === null ? "Add Option" : "Edit Option"}
            </Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="p-4 overflow-y-auto">
            <div className="flex flex-col gap-y-4">
              {activeOption && (
                <ProductOptionEditor
                  option={activeOption}
                  onChange={setActiveOption}
                  titleLocale={optionTitleLocale}
                  onTitleLocaleChange={setOptionTitleLocale}
                  disabled={isSaving}
                />
              )}
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <div className="flex items-center justify-end gap-2">
              <Drawer.Close asChild>
                <Button variant="secondary" disabled={isSaving}>Cancel</Button>
              </Drawer.Close>
              <Button
                onClick={() => void handleSaveOption()}
                isLoading={isSaving}
                disabled={isSaving}
              >
                Save
              </Button>
            </div>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  );
}
