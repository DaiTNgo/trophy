import {
  Badge,
  Button,
  Container,
  FocusModal,
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
  RefreshCw,
  Trash,
} from "lucide-react";
import { DropdownMenu } from "@medusajs/ui";
import { MediaPreview } from "../../components/ui/media-preview";
import { LocalizedTextField } from "../../components/ui/medusa";
import type { CatalogProduct } from "../../types";
import { VariantBatchDrawer } from "./product-detail-variant-batch-drawer";
import { useProductDetailVariants } from "./use-product-detail-variants";

type ProductDetailVariantsProps = {
  product: CatalogProduct;
  mutate: () => Promise<void>;
};

const misaStatus = {
  synced: { label: "Synced", color: "green" as const },
  pending: { label: "Pending", color: "grey" as const },
  failed: { label: "Failed", color: "red" as const },
};

export function ProductDetailVariants({ product, mutate }: ProductDetailVariantsProps) {
  const state = useProductDetailVariants({ product, mutate });
  const {
    priceOpen, setPriceOpen, stockOpen, setStockOpen, variantOpen, setVariantOpen,
    priceRows, setPriceRows, stockRows, setStockRows, variantForm, setVariantForm,
    variantTitleLocale, setVariantTitleLocale, variantAttributeLocale, setVariantAttributeLocale,
    isSavingPrices, isSavingStock, isSavingVariant, isUploadingVariantMedia,
    variantMediaInputRef, variantCustomizationMediaInputRef, openPrices, openStock,
    openVariantEditor, updateVariantAttribute, savePrices, saveStock, saveVariant,
    handleVariantMediaUpload, handleCustomizationMediaUpload, handleDeleteVariant,
    handleSyncVariantToMisa, syncingMisaVariantId,
  } = state;

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
          <div className="overflow-x-auto">
            <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell className="w-12 pl-6" />
                <Table.HeaderCell>Title</Table.HeaderCell>
                <Table.HeaderCell>SKU</Table.HeaderCell>
                <Table.HeaderCell>MISA</Table.HeaderCell>
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
                  <Table.Cell />
                </Table.Row>
              ) : null}
              {product.variants.map((variant) => (
                <Table.Row key={variant.id}>
                  <Table.Cell className="pl-6">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-ui-border-base bg-ui-bg-subtle overflow-hidden">
                      {variant.media.length > 0 ? (
                        <MediaPreview
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
                  <Table.Cell>
                    <Badge
                      size="xsmall"
                      color={misaStatus[variant.misaSyncStatus ?? "pending"].color}
                      title={variant.misaLastError ?? undefined}
                    >
                      {misaStatus[variant.misaSyncStatus ?? "pending"].label}
                    </Badge>
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
                        {product.status === "Published" ? (
                          <DropdownMenu.Item
                            onClick={() => void handleSyncVariantToMisa(Number(variant.id))}
                            disabled={syncingMisaVariantId === Number(variant.id)}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            {syncingMisaVariantId === Number(variant.id) ? "Syncing MISA" : "Sync MISA"}
                          </DropdownMenu.Item>
                        ) : null}
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

      <VariantBatchDrawer
        open={priceOpen}
        title="Edit prices"
        rows={priceRows.map((row) => ({ ...row, value: row.priceAmount }))}
        inputType="number"
        submitLabel="Save prices"
        isSaving={isSavingPrices}
        onOpenChange={setPriceOpen}
        onRowsChange={(rows) =>
          setPriceRows(rows.map(({ id, title, value }) => ({ id, title, priceAmount: value })))
        }
        onSave={() => void savePrices()}
      />

      <VariantBatchDrawer
        open={stockOpen}
        title="Edit stock"
        rows={stockRows.map((row) => ({ ...row, value: row.inventoryQuantity }))}
        inputType="number"
        submitLabel="Save stock"
        isSaving={isSavingStock}
        onOpenChange={setStockOpen}
        onRowsChange={(rows) =>
          setStockRows(rows.map(({ id, title, value }) => ({ id, title, inventoryQuantity: value })))
        }
        onSave={() => void saveStock()}
      />

      <FocusModal open={variantOpen} onOpenChange={setVariantOpen}>
        <FocusModal.Content>
          <FocusModal.Header>
          </FocusModal.Header>
          <FocusModal.Body className="overflow-y-auto px-6 py-8">
            <div className="mx-auto flex w-full max-w-[760px] flex-col gap-8">

              <section className="space-y-4">
                <div>
                  <Heading level="h3" className="text-base font-medium">
                    Details
                  </Heading>
                  <Text size="small" className="text-ui-fg-subtle">
                    Name the variant and add an optional SKU.
                  </Text>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <LocalizedTextField
                    id="variant-title"
                    label="Title"
                    value={variantForm.titleTranslations}
                    locale={variantTitleLocale}
                    onLocaleChange={setVariantTitleLocale}
                    onChange={(value) =>
                      setVariantForm((current) => ({
                        ...current,
                        titleTranslations: value,
                      }))
                    }
                    placeholder={{
                      vi: "Default variant",
                      en: "Default variant",
                    }}
                    requiredLocales={["vi"]}
                  />
                  <div className="space-y-1.5">
                    <Label size="small">
                      SKU <span className="text-ui-fg-muted">(Optional)</span>
                    </Label>
                    <Input
                      value={variantForm.sku}
                      onChange={(event) => setVariantForm((current) => ({ ...current, sku: event.target.value }))}
                      placeholder="SKU-001"
                    />
                  </div>
                </div>
              </section>

              {product.customization?.enabled ? (
                <section className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Heading level="h3" className="text-base font-medium">
                        Customization Media
                      </Heading>
                      <Text size="small" className="text-ui-fg-subtle">
                        This separate image is the customization canvas for this variant.
                      </Text>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      onClick={() => variantCustomizationMediaInputRef.current?.click()}
                      isLoading={isUploadingVariantMedia}
                    >
                      <ImagePlus className="h-4 w-4" />
                      {variantForm.customizationMedia ? "Replace customization media" : "Upload customization media"}
                    </Button>
                  </div>
                  <input
                    ref={variantCustomizationMediaInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    className="hidden"
                    onChange={(event) => {
                      void handleCustomizationMediaUpload(event.target.files);
                      event.target.value = "";
                    }}
                  />
                  {variantForm.customizationMedia ? (
                    <div className="flex items-center gap-3 rounded-lg border border-ui-border-base p-3">
                      <MediaPreview
                        src={variantForm.customizationMedia.url}
                        mimeType={variantForm.customizationMedia.mimeType}
                        alt={variantForm.customizationMedia.fileName}
                        className="h-20 w-20 rounded border object-contain"
                      />
                      <Text size="small" className="line-clamp-2">
                        {variantForm.customizationMedia.fileName}
                      </Text>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-ui-border-base bg-ui-bg-subtle px-4 py-6 text-center">
                      <Text size="small" className="text-ui-fg-subtle">No customization canvas uploaded.</Text>
                    </div>
                  )}
                </section>
              ) : null}

              <section className="space-y-4">
                <div>
                  <Heading level="h3" className="text-base font-medium">
                    Options
                  </Heading>
                  <Text size="small" className="text-ui-fg-subtle">
                    Choose one value from each product option.
                  </Text>
                </div>
                {product.optionDefinitions.length === 0 ? (
                  <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle px-4 py-3">
                    <Text size="small" className="text-ui-fg-subtle">
                      This product does not have custom options. The variant will use the default option value.
                    </Text>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
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
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <div>
                  <Heading level="h3" className="text-base font-medium">
                    Price
                  </Heading>
                  <Text size="small" className="text-ui-fg-subtle">
                    Leave blank for Contact Price.
                  </Text>
                </div>
                <div className="flex max-w-[240px] items-center rounded-md border border-ui-border-base bg-ui-bg-field px-2 shadow-buttons-neutral">
                  <Text size="small" className="px-1 text-ui-fg-muted">
                    $
                  </Text>
                  <Input
                    value={variantForm.priceAmount}
                    onChange={(event) =>
                      setVariantForm((current) => ({
                        ...current,
                        priceAmount: event.target.value,
                      }))
                    }
                    type="number"
                    min="0"
                    className="border-0 bg-transparent shadow-none"
                    placeholder="0"
                  />
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Heading level="h3" className="text-base font-medium">
                      Attributes
                    </Heading>
                    <Text size="small" className="text-ui-fg-subtle">
                      Product detail attributes stay shared. Change values here only when this variant needs different values.
                    </Text>
                  </div>
                </div>

                {product.attributes.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-ui-border-base bg-ui-bg-subtle px-4 py-4">
                    <Text size="small" className="text-ui-fg-subtle">
                      This product has no attributes to override.
                    </Text>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {variantForm.attributes.map((attribute, index) => (
                      <div key={`variant-attribute-${index}`} className="grid gap-3 rounded-lg border border-ui-border-base p-4 md:grid-cols-[1fr_1fr]">
                        <div className="flex items-center">
                          <Text size="small" weight="plus">{attribute.key.vi}</Text>
                        </div>
                        <LocalizedTextField
                          id={`variant-attribute-value-${index}`}
                          value={attribute.value}
                          locale={variantAttributeLocale}
                          onLocaleChange={setVariantAttributeLocale}
                          onChange={(value) => updateVariantAttribute(index, "value", value)}
                          placeholder={{ vi: "18k gold", en: "18k gold" }}
                          requiredLocales={["vi"]}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Heading level="h3" className="text-base font-medium">
                      Media
                    </Heading>
                    <Text size="small" className="text-ui-fg-subtle">
                      Upload images or PDFs for the variant preview.
                    </Text>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => variantMediaInputRef.current?.click()}
                    isLoading={isUploadingVariantMedia}
                  >
                    <ImagePlus className="h-4 w-4" />
                    Upload media
                  </Button>
                </div>
                <input
                  ref={variantMediaInputRef}
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    void handleVariantMediaUpload(event.target.files);
                    event.target.value = "";
                  }}
                />
                {variantForm.media.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-ui-border-base bg-ui-bg-subtle px-4 py-6 text-center">
                    <ImageIcon className="mx-auto h-5 w-5 text-ui-fg-muted" />
                    <Text size="small" className="mt-2 text-ui-fg-subtle">
                      No variant media selected.
                    </Text>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {variantForm.media.map((asset, index) => (
                      <div key={`${asset.assetId}-${index}`} className="overflow-hidden rounded-lg border border-ui-border-base">
                        <MediaPreview
                          src={asset.url}
                          mimeType={asset.mimeType}
                          alt={asset.fileName}
                          className="h-32 w-full object-contain bg-ui-bg-subtle"
                        />
                        <div className="flex items-center justify-between gap-3 px-3 py-3">
                          <Text size="small" weight="plus" className="line-clamp-1">
                            {asset.fileName}
                          </Text>
                          <IconButton
                            type="button"
                            variant="transparent"
                            onClick={() =>
                              setVariantForm((current) => ({
                                ...current,
                                media: current.media.filter((_, currentIndex) => currentIndex !== index),
                              }))
                            }
                          >
                            <Trash className="h-4 w-4 text-ui-fg-error" />
                          </IconButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <div>
                  <Heading level="h3" className="text-base font-medium">
                    Inventory
                  </Heading>
                  <Text size="small" className="text-ui-fg-subtle">
                    Set stock quantity and selling behavior when quantity reaches zero.
                  </Text>
                </div>
                <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                  <div className="space-y-1.5">
                    <Label size="small">Inventory quantity</Label>
                    <Input
                      value={variantForm.inventoryQuantity}
                      onChange={(event) =>
                        setVariantForm((current) => ({
                          ...current,
                          inventoryQuantity: event.target.value,
                        }))
                      }
                      type="number"
                      min="0"
                      placeholder="0"
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
                </div>
              </section>
            </div>
          </FocusModal.Body>
          <FocusModal.Footer>
            <div className="flex w-full items-center justify-end gap-2">
              <FocusModal.Close asChild>
                <Button variant="secondary" disabled={isSavingVariant}>
                  Cancel
                </Button>
              </FocusModal.Close>
              <Button onClick={() => void saveVariant()} isLoading={isSavingVariant}>
                {variantForm.id ? "Save variant" : "Create variant"}
              </Button>
            </div>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>

    </Container>
  );
}
