import {
  Button,
  DropdownMenu,
  Heading,
  Input,
  Switch,
  Table,
  Text,
} from "@medusajs/ui";
import { Adjustments } from "@medusajs/icons";
import { ExternalLink, Loader2, Trash2, Upload } from "lucide-react";
import { InlineError } from "../../components/ui/medusa/inline-error";
import {
  buildVariantSignature,
  type useCreateProduct,
} from "./use-create-product";

type CreateProductVariantsProps = {
  state: ReturnType<typeof useCreateProduct>;
};

export function CreateProductVariants({ state }: CreateProductVariantsProps) {
  const {
    values,
    errors,
    customizationTabError,
    variantMediaError,
    showColumns,
    setShowColumns,
    effectiveVariantRows,
    processingVariantKeys,
    isSubmittingMedia,
    fileInputRefs,
    handleVariantMediaUpload,
    handleDeleteVariantMedia,
    openVariantGallery,
    updateVariantRow,
  } = state;

  const variantViewColumns = [
    { id: "sku", label: "SKU" },
    { id: "media", label: "Media" },
    { id: "backorder", label: "Allow backorder" },
    { id: "price", label: "Price" },
    { id: "inventory", label: "Inventory quantity" },
  ] as const;

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4 px-2 pt-2">
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <Button variant="secondary" size="small">
                <Adjustments className="size-4" />
                Views
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="start">
              <DropdownMenu.Label>Toggle columns</DropdownMenu.Label>
              <DropdownMenu.Separator />
              {variantViewColumns.map((col) => (
                <DropdownMenu.CheckboxItem
                  key={col.id}
                  checked={showColumns[col.id as keyof typeof showColumns]}
                  onCheckedChange={(checked) =>
                    setShowColumns({
                      ...showColumns,
                      [col.id]: checked === true,
                    })
                  }
                >
                  {col.label}
                </DropdownMenu.CheckboxItem>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>

        <div className="space-y-2 px-2">
          {errors.variants ? <InlineError message={errors.variants} /> : null}
          {customizationTabError ? (
            <InlineError message={customizationTabError} />
          ) : null}
          {variantMediaError ? (
            <InlineError message={variantMediaError} />
          ) : null}
        </div>

        {values.customizationEnabled ? (
          <div className="mx-2 rounded-xl border border-ui-border-base bg-ui-bg-component px-4 py-4">
            <Text weight="plus" size="small">
              Customizable variants need consistent images.
            </Text>
            <Text size="small" className="mt-2 text-ui-fg-subtle">
              Every created variant must have at least one image, and every
              uploaded image must share the same pixel dimensions before you can
              open Customization.
            </Text>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Variant</Table.HeaderCell>
                {showColumns.sku ? (
                  <Table.HeaderCell>SKU</Table.HeaderCell>
                ) : null}
                {showColumns.media ? (
                  <Table.HeaderCell>Media</Table.HeaderCell>
                ) : null}
                {showColumns.backorder ? (
                  <Table.HeaderCell>Allow backorder</Table.HeaderCell>
                ) : null}
                {showColumns.price ? (
                  <Table.HeaderCell>Price</Table.HeaderCell>
                ) : null}
                {showColumns.inventory ? (
                  <Table.HeaderCell>Inventory quantity</Table.HeaderCell>
                ) : null}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {effectiveVariantRows
                .map((v, i) => ({ v, originalIndex: i }))
                .filter(({ v }) => v.shouldCreate)
                .map(({ v: variant, originalIndex }) => {
                  const variantSignature = buildVariantSignature(
                    variant.options,
                  );
                  const isUploading =
                    processingVariantKeys.includes(variantSignature);

                  return (
                    <Table.Row key={variantSignature} className="align-top">
                      <Table.Cell className="py-4">
                        <div className="min-w-[180px]">
                          <Input
                            value={variant.title}
                            onChange={(event) =>
                              updateVariantRow(
                                originalIndex,
                                "title",
                                event.target.value,
                              )
                            }
                            placeholder="Default variant"
                          />
                          <Text size="small" className="mt-2 text-ui-fg-subtle">
                            {variant.options.length > 0
                              ? variant.options
                                  .map(
                                    (option) =>
                                      `${option.option}: ${option.value}`,
                                  )
                                  .join(" • ")
                              : "Default option value"}
                          </Text>
                        </div>
                      </Table.Cell>
                      {showColumns.sku ? (
                        <Table.Cell className="py-4">
                          <Input
                            value={variant.sku}
                            onChange={(event) =>
                              updateVariantRow(
                                originalIndex,
                                "sku",
                                event.target.value,
                              )
                            }
                            placeholder="SKU"
                          />
                        </Table.Cell>
                      ) : null}
                      {showColumns.media ? (
                        <Table.Cell className="py-4">
                          <input
                            ref={(element) => {
                              fileInputRefs.current[variantSignature] = element;
                            }}
                            type="file"
                            accept="image/png,image/jpeg,application/pdf"
                            multiple
                            className="hidden"
                            onChange={(event) => {
                              void handleVariantMediaUpload(
                                variantSignature,
                                event.target.files,
                              );
                              event.target.value = "";
                            }}
                          />
                          <div className="min-w-[240px] space-y-3">
                            <Button
                              type="button"
                              variant="secondary"
                              size="small"
                              disabled={isUploading || isSubmittingMedia}
                              onClick={() =>
                                fileInputRefs.current[variantSignature]?.click()
                              }
                            >
                              {isUploading ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Upload className="size-4" />
                              )}
                              {isUploading ? "Uploading..." : "Upload media"}
                            </Button>
                            {variant.media.length === 0 ? (
                              <Text size="small" className="text-ui-fg-subtle">
                                No variant media yet.
                              </Text>
                            ) : (
                              <div className="grid grid-cols-2 gap-3">
                                {variant.media.map((asset) => (
                                  <div
                                    key={asset.id}
                                    className="overflow-hidden rounded-lg border border-ui-border-base"
                                  >
                                    <button
                                      type="button"
                                      className="block w-full bg-ui-bg-subtle"
                                      onClick={() =>
                                        openVariantGallery(
                                          variant.title,
                                          variant.media,
                                          variant.media.findIndex(
                                            (item) => item.id === asset.id,
                                          ),
                                        )
                                      }
                                    >
                                      <img
                                        src={asset.contentUrl}
                                        alt={asset.fileName}
                                        className="h-24 w-full object-cover"
                                      />
                                    </button>
                                    <div className="space-y-2 px-3 py-3">
                                      <Text
                                        size="small"
                                        weight="plus"
                                        className="line-clamp-1"
                                      >
                                        {asset.fileName}
                                      </Text>
                                      <Text
                                        size="small"
                                        className="text-ui-fg-subtle"
                                      >
                                        {asset.widthPx}x{asset.heightPx}
                                      </Text>
                                      <div className="flex gap-2">
                                        <a
                                          href={asset.contentUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 rounded-md border border-ui-border-base px-2 py-1 text-xs font-medium text-ui-fg-base"
                                          onClick={(event) => {
                                            event.preventDefault();
                                            openVariantGallery(
                                              variant.title,
                                              variant.media,
                                              variant.media.findIndex(
                                                (item) => item.id === asset.id,
                                              ),
                                            );
                                          }}
                                        >
                                          <ExternalLink className="size-3" />
                                          Preview
                                        </a>
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          size="small"
                                          onClick={() => {
                                            void handleDeleteVariantMedia(
                                              variantSignature,
                                              asset.id,
                                            );
                                          }}
                                        >
                                          <Trash2 className="size-4" />
                                          Delete
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </Table.Cell>
                      ) : null}
                      {showColumns.backorder ? (
                        <Table.Cell className="py-4">
                          <div className="flex justify-center pt-1">
                            <Switch
                              checked={variant.allowBackorder}
                              onCheckedChange={(checked) =>
                                updateVariantRow(
                                  originalIndex,
                                  "allowBackorder",
                                  checked,
                                )
                              }
                            />
                          </div>
                        </Table.Cell>
                      ) : null}
                      {showColumns.price ? (
                        <Table.Cell className="py-4">
                          <div className="flex min-w-[140px] items-center rounded-md border border-ui-border-base bg-ui-bg-field px-2 shadow-buttons-neutral">
                            <Text
                              size="small"
                              className="px-1 text-ui-fg-muted"
                            >
                              $
                            </Text>
                            <Input
                              value={
                                variant.price === 0 ? "" : String(variant.price)
                              }
                              onChange={(event) =>
                                updateVariantRow(
                                  originalIndex,
                                  "price",
                                  Number(event.target.value || 0),
                                )
                              }
                              type="number"
                              className="border-0 bg-transparent shadow-none"
                              placeholder="0"
                            />
                          </div>
                        </Table.Cell>
                      ) : null}
                      {showColumns.inventory ? (
                        <Table.Cell className="py-4">
                          <Input
                            value={String(variant.inventory)}
                            onChange={(event) =>
                              updateVariantRow(
                                originalIndex,
                                "inventory",
                                Number(event.target.value || 0),
                              )
                            }
                            type="number"
                            placeholder="0"
                          />
                        </Table.Cell>
                      ) : null}
                    </Table.Row>
                  );
                })}
            </Table.Body>
          </Table>
        </div>
      </div>
    </div>
  );
}
