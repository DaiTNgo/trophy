import { useState } from "react";
import { Badge, Button, Container, Drawer, IconButton, Heading, Input, Select, Text, DropdownMenu, toast } from "@medusajs/ui";
import { MoreHorizontal, Plus, Trash2, X } from "lucide-react";
import { ColorSwatchPicker, ImageSwatchPicker } from "../../components/ui/option-swatch-picker";
import {
  LocalizedTextField,
  createLocalizedText,
  getMissingLocalizedTextLocales,
} from "../../components/ui/medusa";
import {
  createProductOption,
  createProductOptionValue,
  deleteProductOption,
  deleteProductOptionValue,
  updateProductOption,
  updateProductOptionValue,
} from "../../lib/products-client";
import type { CatalogProduct, AdminLocale, LocalizedTextValue } from "../../types";

type ProductDetailOptionsProps = {
  product: CatalogProduct;
  mutate: () => Promise<void>;
};

type OptionDraft = {
  id: number | null;
  titleTranslations: LocalizedTextValue;
  displayType: "text" | "color" | "image";
  values: Array<{
    id: number | null;
    valueTranslations: LocalizedTextValue;
    colorHex?: string | null;
    swatchAssetId?: string | null;
    swatchAssetUrl?: string | null;
  }>;
};

export function ProductDetailOptions({ product, mutate }: ProductDetailOptionsProps) {
  const [activeOption, setActiveOption] = useState<OptionDraft | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [optionTitleTranslations, setOptionTitleTranslations] = useState<LocalizedTextValue>(createLocalizedText(""));
  const [optionTitleLocale, setOptionTitleLocale] = useState<AdminLocale>("vi");
  const [optionDisplayType, setOptionDisplayType] = useState<"text" | "color" | "image">("text");
  const [optionValues, setOptionValues] = useState<Array<{
    id: number | null;
    valueTranslations: LocalizedTextValue;
    colorHex?: string | null;
    swatchAssetId?: string | null;
    swatchAssetUrl?: string | null;
  }>>([]);
  const [valueDraft, setValueDraft] = useState("");
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
    setOptionTitleTranslations(titleTranslations);
    setOptionDisplayType(displayType);
    setOptionValues(
      option.values.map((v) => ({
        id: Number(v.id),
        valueTranslations: v.valueTranslations ?? createLocalizedText(v.value),
        colorHex: v.colorHex ?? null,
        swatchAssetId: v.swatchAssetId ?? null,
        swatchAssetUrl: v.swatchAssetUrl ?? null,
      })),
    );
    setValueDraft("");
    setModalOpen(true);
  }

  function openAddOption() {
    setActiveOption(null);
    setOptionTitleTranslations(createLocalizedText(""));
    setOptionDisplayType("text");
    setOptionValues([]);
    setValueDraft("");
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
    setIsSaving(true);

    const trimmedTitleVi = optionTitleTranslations.vi.trim();
    const trimmedTitleEn = optionTitleTranslations.en.trim();
    if (!trimmedTitleVi) {
      const message = "Vietnamese option title is required.";
      toast.error("Option could not be saved", {
        description: `${message} Enter a Vietnamese option title and at least one value, then try again.`,
      });
      setIsSaving(false);
      return;
    }

    // append any draft value left in the input
    let finalValues = [...optionValues];
    const trimmedDraft = valueDraft.trim();
    if (trimmedDraft) {
      if (!finalValues.some((v) => v.valueTranslations.vi.toLowerCase() === trimmedDraft.toLowerCase())) {
        finalValues.push({ id: null, valueTranslations: createLocalizedText(trimmedDraft) });
      }
    }

    if (finalValues.length === 0) {
      const message = "At least one variation value is required.";
      toast.error("Option could not be saved", {
        description: `${message} Add at least one variation value, then try again.`,
      });
      setIsSaving(false);
      return;
    }

    try {
      if (activeOption === null) {
        // Creating a new option
        await createProductOption(product.id, {
          title: { vi: trimmedTitleVi, en: trimmedTitleEn },
          displayType: optionDisplayType,
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
        // Updating an existing option
        const optionId = activeOption.id!;

        // 1. Update title and displayType if changed
        if (
          activeOption.titleTranslations.vi !== trimmedTitleVi ||
          activeOption.titleTranslations.en !== trimmedTitleEn ||
          activeOption.displayType !== optionDisplayType
        ) {
          await updateProductOption(product.id, optionId, {
            title: { vi: trimmedTitleVi, en: trimmedTitleEn },
            displayType: optionDisplayType,
          });
        }

        // 2. Delete removed values
        const removedValues = activeOption.values.filter(
          (orig) => !finalValues.some((curr) => curr.id === orig.id)
        );
        for (const val of removedValues) {
          await deleteProductOptionValue(product.id, val.id!);
        }

        // 3. Update existing values if changed
        const existingValues = finalValues.filter((v) => v.id !== null);
        for (const val of existingValues) {
          const origVal = activeOption.values.find((orig) => orig.id === val.id);
          if (
            origVal && 
            (origVal.valueTranslations.vi !== val.valueTranslations.vi.trim() ||
             origVal.valueTranslations.en !== val.valueTranslations.en.trim() ||
             origVal.colorHex !== val.colorHex ||
             origVal.swatchAssetId !== val.swatchAssetId)
          ) {
            await updateProductOptionValue(product.id, val.id!, {
              value: { vi: val.valueTranslations.vi.trim(), en: val.valueTranslations.en.trim() },
              colorHex: val.colorHex ?? null,
              swatchAssetId: val.swatchAssetId ?? null,
            });
          }
        }

        // 4. Create new values
        const newValues = finalValues.filter((v) => v.id === null);
        for (const val of newValues) {
          await createProductOptionValue(product.id, optionId, {
            value: { vi: val.valueTranslations.vi.trim(), en: val.valueTranslations.en.trim() },
            colorHex: val.colorHex ?? null,
            swatchAssetId: val.swatchAssetId ?? null,
          });
        }
      }

      await mutate();
      setModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save option.");
    } finally {
      setIsSaving(false);
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

              <div className="rounded-xl border border-ui-border-base p-4 space-y-4">
                <div className="grid gap-4 grid-cols-[84px_minmax(0,1fr)]">
                  <div className="space-y-6 pt-2">
                    <Text weight="plus" size="small">
                      Title
                    </Text>
                    <Text weight="plus" size="small">
                      Display
                    </Text>
                  </div>
                  <div className="space-y-3">
                    <LocalizedTextField
                      id="option-title"
                      value={optionTitleTranslations}
                      locale={optionTitleLocale}
                      onLocaleChange={setOptionTitleLocale}
                      onChange={setOptionTitleTranslations}
                      placeholder={{
                        vi: "Màu sắc",
                        en: "Color",
                      }}
                      requiredLocales={["vi"]}
                    />

                    <div className="flex items-center gap-3">
                      <Select
                        size="small"
                        value={optionDisplayType}
                        onValueChange={(val) =>
                          setOptionDisplayType(val as "text" | "color" | "image")
                        }
                        disabled={isSaving}
                      >
                        <Select.Trigger className="w-52">
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="text">
                            Text button (Default)
                          </Select.Item>
                          <Select.Item value="color">
                            Color swatch (Màu sắc)
                          </Select.Item>
                          <Select.Item value="image">
                            Image swatch (Mẫu vân / Icon)
                          </Select.Item>
                        </Select.Content>
                      </Select>
                      <Text size="xsmall" className="text-ui-fg-muted">
                        {optionDisplayType === "color"
                          ? "Color picker (HEX)"
                          : optionDisplayType === "image"
                          ? "Texture / icon upload"
                          : "Standard text button"}
                      </Text>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 grid-cols-[84px_minmax(0,1fr)] pt-2 border-t border-ui-border-base/50">
                  <div className="pt-2">
                    <Text weight="plus" size="small">
                      Values
                    </Text>
                  </div>
                  <div className="space-y-2.5">
                    {optionDisplayType === "text" ? (
                      <div className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 shadow-buttons-neutral">
                        <div className="flex flex-wrap gap-2 items-center">
                          {optionValues.map((v, index) => {
                            const missingLocales = getMissingLocalizedTextLocales(v.valueTranslations);
                            return (
                              <Badge
                                key={v.id ?? index}
                                size="xsmall"
                                color={missingLocales.length > 0 ? "orange" : "blue"}
                                className="gap-x-1.5 py-1"
                              >
                                <input
                                  value={v.valueTranslations.vi}
                                  onChange={(event) => {
                                    setOptionValues((curr) => {
                                      const next = [...curr];
                                      next[index] = {
                                        ...next[index],
                                        valueTranslations: {
                                          ...next[index].valueTranslations,
                                          vi: event.target.value,
                                        },
                                      };
                                      return next;
                                    });
                                  }}
                                  className="min-w-[2ch] max-w-[16ch] bg-transparent text-xs outline-none placeholder:text-ui-fg-muted"
                                  style={{ width: `${Math.max(v.valueTranslations.vi.length, 2)}ch` }}
                                  placeholder="__"
                                  aria-label="Vietnamese option value"
                                  disabled={isSaving}
                                />
                                <span className="text-ui-fg-muted">/</span>
                                <input
                                  value={v.valueTranslations.en}
                                  onChange={(event) => {
                                    setOptionValues((curr) => {
                                      const next = [...curr];
                                      next[index] = {
                                        ...next[index],
                                        valueTranslations: {
                                          ...next[index].valueTranslations,
                                          en: event.target.value,
                                        },
                                      };
                                      return next;
                                    });
                                  }}
                                  className="min-w-[2ch] max-w-[16ch] bg-transparent text-xs outline-none placeholder:text-ui-fg-muted"
                                  style={{ width: `${Math.max(v.valueTranslations.en.length, 2)}ch` }}
                                  placeholder="__"
                                  aria-label="English option value"
                                  disabled={isSaving}
                                />
                                <button
                                  type="button"
                                  className="inline-flex hover:text-ui-fg-base text-ui-fg-muted focus:outline-none disabled:opacity-50"
                                  disabled={isSaving}
                                  onClick={() => {
                                    setOptionValues((curr) => curr.filter((_, i) => i !== index));
                                  }}
                                  aria-label="Remove option value"
                                >
                                  <X className="size-3" />
                                </button>
                              </Badge>
                            );
                          })}
                          <input
                            value={valueDraft}
                            disabled={isSaving}
                            onChange={(event) => setValueDraft(event.target.value)}
                            onBlur={() => {
                              const trimmed = valueDraft.trim();
                              if (trimmed) {
                                if (!optionValues.some((v) => v.valueTranslations.vi.toLowerCase() === trimmed.toLowerCase())) {
                                  setOptionValues((curr) => [
                                    ...curr,
                                    {
                                      id: null,
                                      valueTranslations: createLocalizedText(trimmed),
                                      colorHex: null,
                                      swatchAssetId: null,
                                      swatchAssetUrl: null,
                                    },
                                  ]);
                                }
                                setValueDraft("");
                              }
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === ",") {
                                event.preventDefault();
                                const trimmed = valueDraft.trim();
                                if (trimmed) {
                                  if (!optionValues.some((v) => v.valueTranslations.vi.toLowerCase() === trimmed.toLowerCase())) {
                                    setOptionValues((curr) => [
                                      ...curr,
                                      {
                                        id: null,
                                        valueTranslations: createLocalizedText(trimmed),
                                        colorHex: null,
                                        swatchAssetId: null,
                                        swatchAssetUrl: null,
                                      },
                                    ]);
                                  }
                                  setValueDraft("");
                                }
                              } else if (
                                event.key === "Backspace" &&
                                !valueDraft &&
                                optionValues.length > 0
                              ) {
                                setOptionValues((curr) => curr.slice(0, -1));
                              }
                            }}
                            className="min-w-[120px] flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-ui-fg-muted focus:ring-0 disabled:opacity-50"
                            placeholder={
                              optionValues.length > 0
                                ? "Add another value..."
                                : "e.g. Red, Blue, Green"
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {optionValues.length === 0 ? (
                          <Text size="small" className="text-ui-fg-muted italic py-1">
                            No values added yet. Click &quot;Add value&quot; below.
                          </Text>
                        ) : (
                          <div className="space-y-1.5">
                            {optionValues.map((v, index) => (
                              <div
                                key={v.id ?? index}
                                className="flex items-center gap-3 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-2"
                              >
                                {optionDisplayType === "color" ? (
                                  <ColorSwatchPicker
                                    colorHex={v.colorHex}
                                    onChange={(hex) => {
                                      setOptionValues((curr) => {
                                        const next = [...curr];
                                        next[index] = { ...next[index], colorHex: hex };
                                        return next;
                                      });
                                    }}
                                  />
                                ) : (
                                  <ImageSwatchPicker
                                    swatchAssetUrl={v.swatchAssetUrl}
                                    onChange={(swatch) => {
                                      setOptionValues((curr) => {
                                        const next = [...curr];
                                        next[index] = {
                                          ...next[index],
                                          swatchAssetId: swatch.swatchAssetId,
                                          swatchAssetUrl: swatch.swatchAssetUrl,
                                        };
                                        return next;
                                      });
                                    }}
                                  />
                                )}
                                <div className="grid grid-cols-2 flex-1 gap-2">
                                  <Input
                                    size="small"
                                    value={v.valueTranslations.vi}
                                    onChange={(e) => {
                                      setOptionValues((curr) => {
                                        const next = [...curr];
                                        next[index] = {
                                          ...next[index],
                                          valueTranslations: {
                                            ...next[index].valueTranslations,
                                            vi: e.target.value,
                                          },
                                        };
                                        return next;
                                      });
                                    }}
                                    placeholder="Tên giá trị (VI)"
                                    disabled={isSaving}
                                  />
                                  <Input
                                    size="small"
                                    value={v.valueTranslations.en}
                                    onChange={(e) => {
                                      setOptionValues((curr) => {
                                        const next = [...curr];
                                        next[index] = {
                                          ...next[index],
                                          valueTranslations: {
                                            ...next[index].valueTranslations,
                                            en: e.target.value,
                                          },
                                        };
                                        return next;
                                      });
                                    }}
                                    placeholder="Value name (EN)"
                                    disabled={isSaving}
                                  />
                                </div>
                                <IconButton
                                  type="button"
                                  variant="transparent"
                                  size="small"
                                  disabled={isSaving}
                                  onClick={() => {
                                    setOptionValues((curr) => curr.filter((_, i) => i !== index));
                                  }}
                                  aria-label="Remove value"
                                >
                                  <Trash2 className="size-4 text-ui-fg-muted hover:text-ui-fg-error" />
                                </IconButton>
                              </div>
                            ))}
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          disabled={isSaving}
                          onClick={() => {
                            setOptionValues((curr) => [
                              ...curr,
                              {
                                id: null,
                                valueTranslations: createLocalizedText(""),
                                colorHex: null,
                                swatchAssetId: null,
                                swatchAssetUrl: null,
                              },
                            ]);
                          }}
                        >
                          <Plus className="size-3.5 mr-1" />
                          Add value
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
