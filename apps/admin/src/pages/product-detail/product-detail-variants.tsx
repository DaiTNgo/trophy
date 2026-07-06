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
  Image as ImageIcon,
  ImagePlus,
  MoreHorizontal,
  Pencil,
  Trash,
} from "lucide-react";
import { DropdownMenu } from "@medusajs/ui";
import { AdminMedia } from "../../components/ui/admin-media";
import { InlineError } from "../../components/ui/medusa/inline-error";
import {
  createProductVariant,
  deleteProductVariant,
  updateProductVariantDetails,
  updateProductVariantMedia,
  updateProductVariantPrices,
  updateProductVariantStock,
} from "../../lib/products-client";
import { uploadProductVariantMedia } from "../../lib/product-assets-client";
import { convertPdfToImageFile } from "../../lib/pdf-preview";
import type { CatalogProduct } from "../../types";

type ProductDetailVariantsProps = {
  product: CatalogProduct;
  mutate: () => Promise<void>;
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
  const [priceOpen, setPriceOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [variantOpen, setVariantOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);

  const [priceRows, setPriceRows] = useState<Array<{ id: number; title: string; priceAmount: string }>>([]);
  const [stockRows, setStockRows] = useState<Array<{ id: number; title: string; inventoryQuantity: string }>>([]);
  const [variantForm, setVariantForm] = useState<VariantFormState>(() => buildVariantForm(product));
  const [mediaVariantId, setMediaVariantId] = useState<number | null>(null);
  const [mediaDrafts, setMediaDrafts] = useState<MediaDraft[]>([]);

  const [priceError, setPriceError] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [variantError, setVariantError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const [isSavingPrices, setIsSavingPrices] = useState(false);
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [isSavingVariant, setIsSavingVariant] = useState(false);
  const [isSavingMedia, setIsSavingMedia] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const mediaInputRef = useRef<HTMLInputElement | null>(null);

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
        Array.from(fileList).map(async (file) => {
          let fileToUpload = file;
          if (file.type === "application/pdf") {
            fileToUpload = await convertPdfToImageFile(file);
          }
          return uploadProductVariantMedia(fileToUpload);
        }),
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
    <Container className="p-0 overflow-hidden">
      <div className="flex flex-col">
        <div className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center lg:justify-between ">
          <Heading level="h2" className="text-xl font-semibold">
            Variants
          </Heading>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <Button variant="secondary" size="small" className="px-2 flex items-center justify-center h-[28px]">
                  <span className="sr-only">More</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Item onClick={openPrices}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Edit prices
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={openStock}>
                  <Boxes className="mr-2 h-4 w-4" />
                  Edit stock
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
            <Button variant="secondary" size="small" className="h-[28px]" onClick={() => openVariantEditor()}>
              Create
            </Button>
          </div>
        </div>

        <div className="flex flex-col">
          {variantError ? <div className="px-6 pt-4"><InlineError message={variantError} /></div> : null}

          <div className="overflow-x-auto">
            <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell className="w-12 pl-6" />
                <Table.HeaderCell>Title</Table.HeaderCell>
                <Table.HeaderCell>SKU</Table.HeaderCell>
                {product.optionDefinitions.map((opt) => (
                  <Table.HeaderCell key={opt.id}>{opt.title}</Table.HeaderCell>
                ))}
                <Table.HeaderCell>Inventory</Table.HeaderCell>
                <Table.HeaderCell className="w-12 pr-6" />
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
                  <Table.Cell className="pl-6">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-ui-border-base bg-ui-bg-subtle overflow-hidden">
                      {variant.media.length > 0 ? (
                        <AdminMedia
                          src={variant.media[0].contentUrl}
                          mimeType={variant.media[0].mimeType}
                          alt={variant.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-ui-fg-muted" />
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small" className="text-ui-fg-base">
                      {variant.title}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="small" className="text-ui-fg-subtle">
                      {variant.sku || "-"}
                    </Text>
                  </Table.Cell>
                  {product.optionDefinitions.map((opt) => {
                    const selected = variant.options.find((o) => o.option === opt.title);
                    return (
                      <Table.Cell key={opt.id}>
                        {selected ? (
                          <Badge size="xsmall" className="font-normal text-ui-fg-subtle">
                            {selected.value}
                          </Badge>
                        ) : (
                          <Text size="small" className="text-ui-fg-subtle">-</Text>
                        )}
                      </Table.Cell>
                    );
                  })}
                  <Table.Cell>
                    <Text size="small" className="text-ui-fg-subtle">
                      {variant.inventory} available
                    </Text>
                  </Table.Cell>
                  <Table.Cell className="pr-6">
                    <DropdownMenu>
                      <DropdownMenu.Trigger asChild>
                        <IconButton variant="transparent" size="small">
                          <MoreHorizontal className="h-4 w-4 text-ui-fg-muted" />
                        </IconButton>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content align="end">
                        <DropdownMenu.Item onClick={() => openVariantEditor(variant)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenu.Item>
                        <DropdownMenu.Item onClick={() => openMediaEditor(variant)}>
                          <ImagePlus className="mr-2 h-4 w-4" />
                          Edit Media
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item onClick={() => void handleDeleteVariant(Number(variant.id))}>
                          <Trash className="mr-2 h-4 w-4 text-ui-fg-error" />
                          Delete
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
        </div>
      </div>

      <Drawer open={priceOpen} onOpenChange={setPriceOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Edit prices</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-y-4 overflow-y-auto">
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
          <Drawer.Body className="flex flex-col gap-y-4 overflow-y-auto">
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
          <Drawer.Body className="flex flex-col gap-y-6 overflow-y-auto">
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
          <Drawer.Body className="flex flex-col gap-y-6 overflow-y-auto">
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
                      className="h-32 w-full object-contain"
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
