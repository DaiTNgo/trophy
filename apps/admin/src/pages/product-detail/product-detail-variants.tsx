import { useRef, useState } from "react";
import {
  Badge,
  Button,
  Container,
  Drawer,
  IconButton,
  Input,
  Label,
  Heading,
  Select,
  Switch,
  Table,
  Text,
} from "@medusajs/ui";
import {
  Boxes,
  DollarSign,
  ImagePlus,
  Package,
  Pencil,
  Plus,
  Trash,
} from "lucide-react";
import { AdminMedia } from "../../components/ui/admin-media";
import { InlineError } from "../../components/ui/medusa/inline-error";
import {
  createProductOption,
  createProductOptionValue,
  createProductVariant,
  deleteProductOption,
  deleteProductOptionValue,
  deleteProductVariant,
  updateProductOption,
  updateProductOptionValue,
  updateProductVariantDetails,
  updateProductVariantMedia,
  updateProductVariantPrices,
  updateProductVariantStock,
} from "../../lib/products-client";
import { uploadProductVariantMedia } from "../../lib/product-assets-client";
import { formatCurrency } from "../../lib/utils";
import type { CatalogProduct } from "../../types";

type ProductDetailVariantsProps = {
  product: CatalogProduct;
  mutate: () => Promise<void>;
};

type OptionDraft = {
  id: number | null;
  title: string;
  values: Array<{ id: number | null; value: string }>;
};

type VariantFormState = {
  id: number | null;
  title: string;
  sku: string;
  allowBackorder: boolean;
  optionSelections: Record<string, string>;
};

type MediaDraft = {
  assetId: string;
  url: string;
  mimeType: string;
  fileName: string;
};

function getBadgeColor(status: string): "green" | "red" | "blue" | "orange" | "grey" | "purple" {
  switch (status) {
    case "Published":
      return "green";
    case "Draft":
      return "grey";
    default:
      return "grey";
  }
}

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

function buildVariantForm(product: CatalogProduct, variant?: CatalogProduct["variants"][number]): VariantFormState {
  const optionSelections = Object.fromEntries(
    product.optionDefinitions.map((option) => {
      const selectedValue = variant?.options.find(
        (item) => String(item.optionValueId) && item.option === option.title,
      );
      return [option.id, selectedValue?.optionValueId ? String(selectedValue.optionValueId) : "__none__"];
    }),
  );

  return {
    id: variant ? Number(variant.id) : null,
    title: variant?.title ?? "",
    sku: variant?.sku ?? "",
    allowBackorder: variant?.allowBackorder ?? false,
    optionSelections,
  };
}

function buildMediaDraft(variant: CatalogProduct["variants"][number]): MediaDraft[] {
  return variant.media.map((asset) => ({
    assetId: asset.id,
    url: asset.contentUrl,
    mimeType: asset.mimeType,
    fileName: asset.fileName,
  }));
}

export function ProductDetailVariants({ product, mutate }: ProductDetailVariantsProps) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [variantOpen, setVariantOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);

  const [optionsDrafts, setOptionsDrafts] = useState<OptionDraft[]>([]);
  const [priceRows, setPriceRows] = useState<Array<{ id: number; title: string; priceAmount: string }>>([]);
  const [stockRows, setStockRows] = useState<Array<{ id: number; title: string; inventoryQuantity: string }>>([]);
  const [variantForm, setVariantForm] = useState<VariantFormState>(() => buildVariantForm(product));
  const [mediaVariantId, setMediaVariantId] = useState<number | null>(null);
  const [mediaDrafts, setMediaDrafts] = useState<MediaDraft[]>([]);

  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [variantError, setVariantError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const [isSavingOptions, setIsSavingOptions] = useState(false);
  const [isSavingPrices, setIsSavingPrices] = useState(false);
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [isSavingVariant, setIsSavingVariant] = useState(false);
  const [isSavingMedia, setIsSavingMedia] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  function openOptions() {
    setOptionsDrafts(buildOptionDrafts(product));
    setOptionsError(null);
    setOptionsOpen(true);
  }

  function openPrices() {
    setPriceRows(
      product.variants.map((variant) => ({
        id: Number(variant.id),
        title: variant.title,
        priceAmount: variant.price > 0 ? String(variant.price) : "",
      })),
    );
    setPriceError(null);
    setPriceOpen(true);
  }

  function openStock() {
    setStockRows(
      product.variants.map((variant) => ({
        id: Number(variant.id),
        title: variant.title,
        inventoryQuantity: String(variant.inventory),
      })),
    );
    setStockError(null);
    setStockOpen(true);
  }

  function openVariantEditor(variant?: CatalogProduct["variants"][number]) {
    setVariantForm(buildVariantForm(product, variant));
    setVariantError(null);
    setVariantOpen(true);
  }

  function openMediaEditor(variant: CatalogProduct["variants"][number]) {
    setMediaVariantId(Number(variant.id));
    setMediaDrafts(buildMediaDraft(variant));
    setMediaError(null);
    setMediaOpen(true);
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

  async function savePrices() {
    setIsSavingPrices(true);
    setPriceError(null);

    try {
      await updateProductVariantPrices(
        product.id,
        priceRows.map((row) => ({
          id: row.id,
          priceAmount: row.priceAmount.trim() === "" ? null : Number(row.priceAmount),
        })),
      );
      await mutate();
      setPriceOpen(false);
    } catch (error) {
      setPriceError(error instanceof Error ? error.message : "Failed to save price changes.");
    } finally {
      setIsSavingPrices(false);
    }
  }

  async function saveStock() {
    setIsSavingStock(true);
    setStockError(null);

    try {
      await updateProductVariantStock(
        product.id,
        stockRows.map((row) => ({
          id: row.id,
          inventoryQuantity: Number(row.inventoryQuantity || 0),
        })),
      );
      await mutate();
      setStockOpen(false);
    } catch (error) {
      setStockError(error instanceof Error ? error.message : "Failed to save stock changes.");
    } finally {
      setIsSavingStock(false);
    }
  }

  async function saveVariant() {
    setIsSavingVariant(true);
    setVariantError(null);

    try {
      const optionValueIds = product.optionDefinitions.map((option) => {
        const selected = variantForm.optionSelections[option.id];
        if (!selected || selected === "__none__") {
          throw new Error(`Choose a value for ${option.title}.`);
        }
        return Number(selected);
      });

      if (variantForm.id) {
        await updateProductVariantDetails(product.id, variantForm.id, {
          title: variantForm.title.trim(),
          sku: variantForm.sku.trim() || null,
          allowBackorder: variantForm.allowBackorder,
          optionValueIds,
        });
      } else {
        await createProductVariant(product.id, {
          title: variantForm.title.trim(),
          sku: variantForm.sku.trim() || null,
          priceAmount: null,
          inventoryQuantity: 0,
          allowBackorder: variantForm.allowBackorder,
          optionValueIds,
          media: [],
        });
      }

      await mutate();
      setVariantOpen(false);
    } catch (error) {
      setVariantError(error instanceof Error ? error.message : "Failed to save variant details.");
    } finally {
      setIsSavingVariant(false);
    }
  }

  async function handleDeleteVariant(variantId: number) {
    if (!window.confirm("Delete this product variant?")) {
      return;
    }

    try {
      await deleteProductVariant(product.id, variantId);
      await mutate();
    } catch (error) {
      setVariantError(error instanceof Error ? error.message : "Failed to delete variant.");
    }
  }

  async function handleMediaUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    setIsUploadingMedia(true);
    setMediaError(null);

    try {
      const uploadedAssets = await Promise.all(
        Array.from(fileList).map((file) => uploadProductVariantMedia(file)),
      );

      setMediaDrafts((current) => [
        ...current,
        ...uploadedAssets.map((asset) => ({
          assetId: asset.id,
          url: asset.contentUrl,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
        })),
      ]);
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "Failed to upload media.");
    } finally {
      setIsUploadingMedia(false);
    }
  }

  async function saveMedia() {
    if (!mediaVariantId) {
      return;
    }

    setIsSavingMedia(true);
    setMediaError(null);

    try {
      await updateProductVariantMedia(
        product.id,
        mediaVariantId,
        mediaDrafts.map((asset) => ({ assetId: asset.assetId })),
      );
      await mutate();
      setMediaOpen(false);
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "Failed to save variant media.");
    } finally {
      setIsSavingMedia(false);
    }
  }

  return (
    <Container>
      <div className="flex flex-col gap-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-y-1">
            <Heading level="h3">
              <Package className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
              Variants and pricing
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Manage product options, variant rows, prices, stock, and variant media.
            </Text>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="small" onClick={openOptions}>
              <Pencil className="h-4 w-4" />
              Manage options
            </Button>
            <Button variant="secondary" size="small" onClick={() => openVariantEditor()}>
              <Plus className="h-4 w-4" />
              Create variant
            </Button>
            <Button variant="secondary" size="small" onClick={openPrices}>
              <DollarSign className="h-4 w-4" />
              Edit prices
            </Button>
            <Button variant="secondary" size="small" onClick={openStock}>
              <Boxes className="h-4 w-4" />
              Edit stock
            </Button>
          </div>
        </div>

        {variantError ? <InlineError message={variantError} /> : null}

        <div className="overflow-x-auto rounded-lg border border-ui-border-base">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Variant</Table.HeaderCell>
                <Table.HeaderCell>Options</Table.HeaderCell>
                <Table.HeaderCell>Price</Table.HeaderCell>
                <Table.HeaderCell>Stock</Table.HeaderCell>
                <Table.HeaderCell>Backorder</Table.HeaderCell>
                <Table.HeaderCell>Media</Table.HeaderCell>
                <Table.HeaderCell>Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {product.variants.length === 0 ? (
                <Table.Row>
                  <Table.Cell>
                    <Text size="small" className="text-ui-fg-subtle">
                      No product variants yet.
                    </Text>
                  </Table.Cell>
                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                </Table.Row>
              ) : null}
              {product.variants.map((variant) => (
                <Table.Row key={variant.id}>
                  <Table.Cell>
                    <div className="flex flex-col gap-y-1">
                      <Text size="small" weight="plus">
                        {variant.title}
                      </Text>
                      <Text size="small" className="text-ui-fg-subtle">
                        {variant.sku || "No SKU"}
                      </Text>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small" className="text-ui-fg-subtle">
                      {variant.options.length > 0
                        ? variant.options.map((item) => `${item.option}: ${item.value}`).join(" • ")
                        : "No option selections"}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small">
                      {variant.price > 0 ? formatCurrency(variant.price) : "Contact price"}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small">{variant.inventory}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={variant.allowBackorder ? "orange" : "grey"} size="xsmall">
                      {variant.allowBackorder ? "Allowed" : "Disabled"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Button
                      variant="transparent"
                      size="small"
                      onClick={() => openMediaEditor(variant)}
                    >
                      <ImagePlus className="h-4 w-4" />
                      {variant.media.length} assets
                    </Button>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => openVariantEditor(variant)}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => void handleDeleteVariant(Number(variant.id))}
                      >
                        <Trash className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>

        <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
          <div className="flex items-center justify-between">
            <Text size="small" weight="plus">
              Product status
            </Text>
            <Badge color={getBadgeColor(product.status)} size="xsmall" rounded="full">
              {product.status}
            </Badge>
          </div>
          <Text size="small" className="mt-2 text-ui-fg-subtle">
            Product detail now manages options, variants, prices, stock, and variant media through
            separate actions. This page edits Trophy product fields only.
          </Text>
        </div>
      </div>

      <Drawer open={optionsOpen} onOpenChange={setOptionsOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Manage options</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-y-6">
            {optionsError ? <InlineError message={optionsError} /> : null}
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

      <Drawer open={priceOpen} onOpenChange={setPriceOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Edit prices</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-y-4">
            {priceError ? <InlineError message={priceError} /> : null}
            {priceRows.map((row, index) => (
              <div key={row.id} className="grid gap-3 md:grid-cols-[1fr_180px]">
                <div className="flex items-center">
                  <Text size="small" weight="plus">
                    {row.title}
                  </Text>
                </div>
                <Input
                  value={row.priceAmount}
                  onChange={(event) =>
                    setPriceRows((current) =>
                      current.map((item, currentIndex) =>
                        currentIndex === index ? { ...item, priceAmount: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="0"
                  type="number"
                />
              </div>
            ))}
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button variant="secondary" disabled={isSavingPrices}>
                Cancel
              </Button>
            </Drawer.Close>
            <Button onClick={() => void savePrices()} isLoading={isSavingPrices}>
              Save prices
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>

      <Drawer open={stockOpen} onOpenChange={setStockOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Edit stock</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-y-4">
            {stockError ? <InlineError message={stockError} /> : null}
            {stockRows.map((row, index) => (
              <div key={row.id} className="grid gap-3 md:grid-cols-[1fr_180px]">
                <div className="flex items-center">
                  <Text size="small" weight="plus">
                    {row.title}
                  </Text>
                </div>
                <Input
                  value={row.inventoryQuantity}
                  onChange={(event) =>
                    setStockRows((current) =>
                      current.map((item, currentIndex) =>
                        currentIndex === index
                          ? { ...item, inventoryQuantity: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="0"
                  type="number"
                />
              </div>
            ))}
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button variant="secondary" disabled={isSavingStock}>
                Cancel
              </Button>
            </Drawer.Close>
            <Button onClick={() => void saveStock()} isLoading={isSavingStock}>
              Save stock
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>

      <Drawer open={variantOpen} onOpenChange={setVariantOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>{variantForm.id ? "Edit variant details" : "Create variant"}</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-y-6">
            {variantError ? <InlineError message={variantError} /> : null}
            <div className="space-y-1.5">
              <Label size="small">Title</Label>
              <Input
                value={variantForm.title}
                onChange={(event) => setVariantForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Default variant"
              />
            </div>
            <div className="space-y-1.5">
              <Label size="small">SKU</Label>
              <Input
                value={variantForm.sku}
                onChange={(event) => setVariantForm((current) => ({ ...current, sku: event.target.value }))}
                placeholder="SKU-001"
              />
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg border border-ui-border-base px-4 py-3">
              <div className="space-y-1">
                <Text size="small" weight="plus">
                  Allow backorder
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  Keep this variant sellable even when stock reaches zero.
                </Text>
              </div>
              <Switch
                checked={variantForm.allowBackorder}
                onCheckedChange={(checked) =>
                  setVariantForm((current) => ({ ...current, allowBackorder: checked }))
                }
              />
            </div>
            {product.optionDefinitions.map((option) => (
              <div key={option.id} className="space-y-1.5">
                <Label size="small">{option.title}</Label>
                <Select
                  value={variantForm.optionSelections[option.id] ?? "__none__"}
                  onValueChange={(value) =>
                    setVariantForm((current) => ({
                      ...current,
                      optionSelections: {
                        ...current.optionSelections,
                        [option.id]: value,
                      },
                    }))
                  }
                >
                  <Select.Trigger>
                    <Select.Value placeholder={`Choose ${option.title.toLowerCase()}`} />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="__none__">Choose a value</Select.Item>
                    {option.values.map((value) => (
                      <Select.Item key={value.id} value={value.id}>
                        {value.value}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
            ))}
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button variant="secondary" disabled={isSavingVariant}>
                Cancel
              </Button>
            </Drawer.Close>
            <Button onClick={() => void saveVariant()} isLoading={isSavingVariant}>
              {variantForm.id ? "Save variant" : "Create variant"}
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>

      <Drawer open={mediaOpen} onOpenChange={setMediaOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Manage variant media</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-y-6">
            {mediaError ? <InlineError message={mediaError} /> : null}
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/png,image/jpeg,application/pdf"
              multiple
              className="hidden"
              onChange={(event) => {
                void handleMediaUpload(event.target.files);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => mediaInputRef.current?.click()}
              isLoading={isUploadingMedia}
            >
              <ImagePlus className="h-4 w-4" />
              Upload media
            </Button>
            {mediaDrafts.length === 0 ? (
              <Text size="small" className="text-ui-fg-subtle">
                No variant media selected.
              </Text>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {mediaDrafts.map((asset, index) => (
                  <div key={`${asset.assetId}-${index}`} className="overflow-hidden rounded-lg border border-ui-border-base">
                    <AdminMedia
                      src={asset.url}
                      mimeType={asset.mimeType}
                      alt={asset.fileName}
                      className="h-32 w-full object-cover"
                    />
                    <div className="flex items-center justify-between px-3 py-3">
                      <Text size="small" weight="plus" className="line-clamp-1">
                        {asset.fileName}
                      </Text>
                      <IconButton
                        type="button"
                        variant="transparent"
                        onClick={() =>
                          setMediaDrafts((current) =>
                            current.filter((_, currentIndex) => currentIndex !== index),
                          )
                        }
                      >
                        <Trash className="h-4 w-4 text-ui-fg-error" />
                      </IconButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button variant="secondary" disabled={isSavingMedia}>
                Cancel
              </Button>
            </Drawer.Close>
            <Button onClick={() => void saveMedia()} isLoading={isSavingMedia}>
              Save media
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  );
}
