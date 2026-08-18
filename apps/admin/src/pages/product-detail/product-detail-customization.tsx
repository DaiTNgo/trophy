import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  Button,
  Container,
  FocusModal,
  Heading,
  IconButton,
  ProgressTabs,
  Table,
  Text,
  toast,
} from "@medusajs/ui";
import { MediaPreview } from "../../components/ui/media-preview";
import { ImagePlus, Play, Trash2, X } from "lucide-react";
import {
  activateCustomization,
  deactivateCustomization,
  mapApiProductToCatalogProduct,
  permanentlyDeleteCustomization,
  ProductCommandError,
  reactivateCustomization,
  repairCustomization,
} from "../../lib/products-client";
import { convertPdfToImageFile } from "../../lib/pdf-preview";
import type { CatalogProduct } from "../../types";
import { useBrandAssets } from "../../hooks/use-brand-assets";
import { useEmbeddedProductCustomizationEditor } from "../../hooks/use-embedded-product-customization-editor";
import { CreateProductCustomization } from "../create-product/create-product-customization";
import type { EmbeddedCustomizationDraft } from "../create-product-helpers";
import type { BackgroundAsset } from "@trophy/customization";
import {
  stagedBackgroundPreview,
  stagedCustomizationMediaReadiness,
  type StagedCustomizationBackground,
} from "./customization-background-staging";

type ProductDetailCustomizationProps = {
  product: CatalogProduct;
  mutate: () => Promise<void>;
  updateProduct: (updater: (current: CatalogProduct) => CatalogProduct) => void;
};

type SetupMode = "activate" | "repair";

async function readImageDimensions(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new window.Image();
    return await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        image.onload = () =>
          resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = reject;
        image.src = url;
      },
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

function CustomizationBackgroundModal({
  product,
  mode,
  variantIds,
  open,
  onOpenChange,
  onSaved,
  onRevisionConflict,
}: {
  product: CatalogProduct;
  mode: SetupMode;
  variantIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (next: CatalogProduct) => void;
  onRevisionConflict: () => Promise<void>;
}) {
  const [files, setFiles] = useState<
    Record<string, StagedCustomizationBackground>
  >({});
  const [activeTab, setActiveTab] = useState<"media" | "editor">("media");
  const [templateDraft, setTemplateDraft] =
    useState<EmbeddedCustomizationDraft>(() => ({
      enabled: true,
      canvasWidthPx: product.customization?.canvasWidthPx ?? null,
      canvasHeightPx: product.customization?.canvasHeightPx ?? null,
      layers: (product.customization?.layers ??
        []) as EmbeddedCustomizationDraft["layers"],
      formFields: (product.customization?.formFields ??
        []) as EmbeddedCustomizationDraft["formFields"],
    }));
  const [selectedPreviewAssetId, setSelectedPreviewAssetId] = useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const { fonts } = useBrandAssets();
  const variants = useMemo(
    () =>
      variantIds.flatMap((id) => {
        const variant = product.variants.find((item) => item.id === id);
        return variant ? [variant] : [];
      }),
    [product.variants, variantIds],
  );
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const expectedCanvas =
    mode === "repair" &&
      product.customization?.canvasWidthPx &&
      product.customization?.canvasHeightPx
      ? {
        widthPx: product.customization.canvasWidthPx,
        heightPx: product.customization.canvasHeightPx,
      }
      : undefined;
  const mediaReadiness =
    mode === "repair" && !expectedCanvas
      ? { ready: false as const }
      : stagedCustomizationMediaReadiness(
        variants.map((variant) => variant.id),
        files,
        expectedCanvas,
      );

  useEffect(() => {
    const generatedUrls: string[] = [];
    const next = Object.fromEntries(
      Object.entries(files).map(([variantId, staged]) => {
        const previewUrl =
          staged.previewUrl ?? URL.createObjectURL(staged.file);
        if (!staged.previewUrl) generatedUrls.push(previewUrl);
        return [variantId, previewUrl];
      }),
    );
    setPreviewUrls(next);
    return () => generatedUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  useEffect(() => {
    if (!mediaReadiness.ready && activeTab === "editor") {
      setActiveTab("media");
    }
  }, [activeTab, mediaReadiness.ready]);

  const previewBackgrounds = useMemo(
    () =>
      variants.flatMap((variant) => {
        const preview = stagedBackgroundPreview(
          variant.id,
          files[variant.id],
          previewUrls[variant.id],
        );
        return preview ? [preview] : [];
      }),
    [files, previewUrls, variants],
  );
  const selectedBackground =
    previewBackgrounds.find(
      (background) => background.assetId === selectedPreviewAssetId,
    ) ??
    previewBackgrounds[0] ??
    null;
  const embeddedEditor = useEmbeddedProductCustomizationEditor({
    productTitle: product.title.vi,
    productId: product.id,
    background: selectedBackground,
    draft: templateDraft,
    onDraftChange: setTemplateDraft,
  });
  const dynamicFonts = fonts.map((font) => ({
    id: font.id,
    name: font.name,
    regularAssetId: (font as any).regularAssetId || null,
    boldAssetId: (font as any).boldAssetId || null,
    italicAssetId: (font as any).italicAssetId || null,
    boldItalicAssetId: (font as any).boldItalicAssetId || null,
  }));

  const close = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFiles({});
      setActiveTab("media");
      setTemplateDraft({
        enabled: true,
        canvasWidthPx: product.customization?.canvasWidthPx ?? null,
        canvasHeightPx: product.customization?.canvasHeightPx ?? null,
        layers: (product.customization?.layers ??
          []) as EmbeddedCustomizationDraft["layers"],
        formFields: (product.customization?.formFields ??
          []) as EmbeddedCustomizationDraft["formFields"],
      });
    }
    onOpenChange(nextOpen);
  };

  const stageFile = async (
    variantId: string,
    file: File,
    dimensions?: { widthPx: number; heightPx: number },
    previewUrl?: string,
  ) => {
    const isPdf = file.type === "application/pdf";
    const fileToStage = isPdf ? await convertPdfToImageFile(file) : file;
    const size = dimensions && !isPdf
      ? dimensions
      : await readImageDimensions(fileToStage).then(({ width, height }) => ({
        widthPx: width,
        heightPx: height,
      }));
    setFiles((current) => ({
      ...current,
      [variantId]: {
        file: fileToStage,
        widthPx: size.widthPx,
        heightPx: size.heightPx,
        previewUrl: isPdf ? undefined : previewUrl,
      },
    }));
    setSelectedPreviewAssetId(variantId);
  };

  const replaceSelectedBackground = (
    background: BackgroundAsset,
    file?: File,
  ) => {
    if (!file) return;
    const variantId = selectedPreviewAssetId ?? variants[0]?.id;
    if (!variantId) return;
    void stageFile(
      variantId,
      file,
      { widthPx: background.widthPx, heightPx: background.heightPx },
      background.previewUrl,
    );
  };

  const save = async () => {
    if (variants.some((variant) => !files[variant.id])) {
      toast.error("Customization setup is incomplete", {
        description: "Choose one background for every listed variant.",
      });
      return;
    }

    const dimensions = variants.map((variant) => ({
      width: files[variant.id]!.widthPx,
      height: files[variant.id]!.heightPx,
    }));
    const expected =
      mode === "repair"
        ? {
          width: product.customization?.canvasWidthPx,
          height: product.customization?.canvasHeightPx,
        }
        : (dimensions?.[0] ?? null);
    if (
      !dimensions ||
      !expected?.width ||
      !expected.height ||
      dimensions.some(
        (size) =>
          size.width !== expected.width || size.height !== expected.height,
      )
    ) {
      toast.error("Customization Background has the wrong size", {
        description: "Every selected background must use the same canvas size.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const backgrounds = variants.map((variant) => ({
        variantId: variant.id,
        file: files[variant.id]!.file,
        widthPx: files[variant.id]!.widthPx,
        heightPx: files[variant.id]!.heightPx,
      }));
      const next =
        mode === "activate"
          ? await activateCustomization(product.id, product.updatedAt, {
            layers: templateDraft.layers,
            formFields: templateDraft.formFields,
            backgrounds,
          })
          : await repairCustomization(product.id, product.updatedAt, {
            layers: templateDraft.layers,
            formFields: templateDraft.formFields,
            backgrounds,
          });
      onSaved(mapApiProductToCatalogProduct(next));
      close(false);
      toast.success(
        mode === "activate"
          ? "Customization activated"
          : "Customization reactivated",
      );
    } catch (error) {
      if (error instanceof ProductCommandError && error.status === 409) {
        await onRevisionConflict();
      }
      toast.error(
        mode === "activate"
          ? "Customization could not be activated"
          : "Customization could not be reactivated",
        {
          description:
            error instanceof Error
              ? error.message
              : "Review the selected backgrounds and try again.",
        },
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FocusModal open={open} onOpenChange={close}>
      <FocusModal.Content className="md:inset-2">
        <ProgressTabs
          value={activeTab}
          onValueChange={(value) => {
            if (value === "media" || mediaReadiness.ready) {
              setActiveTab(value as "media" | "editor");
            }
          }}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <FocusModal.Header>
            <ProgressTabs.List className="-my-2 w-full border-l">
              <ProgressTabs.Trigger
                value="media"
                status={mediaReadiness.ready ? "completed" : "in-progress"}
              >
                Custom media
              </ProgressTabs.Trigger>
              <ProgressTabs.Trigger
                value="editor"
                status={activeTab === "editor" ? "in-progress" : "not-started"}
                disabled={!mediaReadiness.ready}
              >
                Custom editor
              </ProgressTabs.Trigger>
            </ProgressTabs.List>
          </FocusModal.Header>
          <FocusModal.Body className="overflow-y-auto flex flex-col">
            <div className="flex-1 flex flex-col min-h-0">
              <ProgressTabs.Content value="media" className="outline-none">
                <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
                  <Table>
                    <Table.Header>
                      <Table.Row>
                        <Table.HeaderCell>Variant</Table.HeaderCell>
                        <Table.HeaderCell>Custom media</Table.HeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {variants.map((variant) => (
                        <Table.Row key={variant.id} className="align-top">
                          <Table.Cell className="py-4">
                            <div className="min-w-[180px]">
                              <Text size="small" weight="plus" className="truncate">
                                {variant.title}
                              </Text>
                              {variant.options.length > 0 ? (
                                <Text size="small" className="mt-2 text-ui-fg-subtle">
                                  {variant.options
                                    .map(
                                      (option) =>
                                        `${option.option}: ${option.value}`,
                                    )
                                    .join(" • ")}
                                </Text>
                              ) : null}
                            </div>
                          </Table.Cell>
                          <Table.Cell className="py-4">
                            <div className="min-w-[240px] space-y-3">
                              {files[variant.id] ? (
                                <div className="flex items-center gap-3">
                                  <MediaPreview
                                    file={files[variant.id].file}
                                    className="h-16 w-16 rounded border object-contain"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <Text size="small" className="line-clamp-1">
                                      {files[variant.id].file.name}
                                    </Text>
                                    <Text size="small" className="text-ui-fg-subtle">
                                      {files[variant.id].widthPx}x
                                      {files[variant.id].heightPx}
                                    </Text>
                                  </div>
                                </div>
                              ) : (
                                <Text size="small" className="text-ui-fg-subtle">
                                  No custom media selected
                                </Text>
                              )}
                              <div className="flex items-center gap-1">
                                <input
                                  ref={(element) => {
                                    inputs.current[variant.id] = element;
                                  }}
                                  type="file"
                                  className="hidden"
                                  accept="image/png,image/jpeg,image/webp,application/pdf"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    event.target.value = "";
                                    if (file)
                                      void stageFile(variant.id, file).catch(
                                        () => {
                                          toast.error(
                                            "Customization Media could not be read",
                                          );
                                        },
                                      );
                                  }}
                                />
                                <Button
                                  variant="secondary"
                                  size="small"
                                  onClick={() =>
                                    inputs.current[variant.id]?.click()
                                  }
                                >
                                  <ImagePlus className="h-4 w-4" />
                                  {files[variant.id] ? "Replace" : "Choose"}
                                </Button>
                                {files[variant.id] ? (
                                  <IconButton
                                    aria-label={`Remove Customization Media for ${variant.title}`}
                                    variant="transparent"
                                    size="small"
                                    onClick={() =>
                                      setFiles((current) => {
                                        const next = { ...current };
                                        delete next[variant.id];
                                        return next;
                                      })
                                    }
                                  >
                                    <X className="h-4 w-4" />
                                  </IconButton>
                                ) : null}
                              </div>
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>
                </div>
              </ProgressTabs.Content>
              <ProgressTabs.Content
                value="editor"
                className="outline-none px-6 py-6 flex-1 flex flex-col min-h-0"
              >
                  <CreateProductCustomization
                    state={
                      {
                        embeddedEditor,
                        previewBackgrounds,
                        selectedPreviewAssetId,
                        setSelectedPreviewAssetId,
                        dynamicFonts,
                      } as never
                    }
                    onUploadBackground={replaceSelectedBackground}
                  />
              </ProgressTabs.Content>
            </div>
          </FocusModal.Body>
        </ProgressTabs>
        <FocusModal.Footer>
          <div className="flex w-full justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => close(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void save()}
              isLoading={isSaving}
              disabled={!mediaReadiness.ready || activeTab !== "editor"}
            >
              {mode === "activate"
                ? "Activate customization"
                : "Reactivate customization"}
            </Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  );
}

export function ProductDetailCustomization({
  product,
  mutate,
  updateProduct,
}: ProductDetailCustomizationProps) {
  const [setupOpen, setSetupOpen] = useState(false);
  const [repairVariantIds, setRepairVariantIds] = useState<string[] | null>(
    null,
  );
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "deactivate" | "reactivate" | "delete" | null
  >(null);
  const customization = product.customization;

  const setNextProduct = (next: CatalogProduct) => updateProduct(() => next);

  const enableOrReactivate = async () => {
    if (!customization) {
      if (product.variants.length === 0) {
        toast.error("Customization requires a Variant", {
          description:
            "Create at least one Variant before setting up customization.",
        });
        return;
      }
      setSetupOpen(true);
      return;
    }

    setPendingAction("reactivate");
    try {
      const result = await reactivateCustomization(
        product.id,
        product.updatedAt,
      );
      if ("item" in result) {
        setNextProduct(mapApiProductToCatalogProduct(result.item));
        toast.success("Customization reactivated");
      } else {
        setRepairVariantIds(result.missingBackgroundVariantIds.map(String));
      }
    } catch (error) {
      if (error instanceof ProductCommandError && error.status === 409)
        await mutate();
      toast.error("Customization could not be reactivated", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setPendingAction(null);
    }
  };

  const deactivate = async () => {
    setPendingAction("deactivate");
    try {
      setNextProduct(
        mapApiProductToCatalogProduct(
          await deactivateCustomization(product.id, product.updatedAt),
        ),
      );
      toast.success("Customization deactivated");
    } catch (error) {
      if (error instanceof ProductCommandError && error.status === 409)
        await mutate();
      toast.error("Customization could not be deactivated", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setPendingAction(null);
    }
  };

  const permanentlyDelete = async () => {
    setPendingAction("delete");
    try {
      setNextProduct(
        mapApiProductToCatalogProduct(
          await permanentlyDeleteCustomization(product.id, product.updatedAt),
        ),
      );
      setConfirmDeleteOpen(false);
      toast.success("Customization deleted permanently");
    } catch (error) {
      if (error instanceof ProductCommandError && error.status === 409)
        await mutate();
      toast.error("Customization could not be deleted", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <>
      <Container className="p-0 overflow-hidden">
        <div className="flex flex-col">
          <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-y-1">
              <Heading level="h2" className="text-xl font-semibold">
                Customization
              </Heading>
              <Text size="small" className="text-ui-fg-subtle">
                {customization?.enabled
                  ? "Active for shoppers"
                  : customization
                    ? "Deactivated with saved setup"
                    : "Not configured"}
              </Text>
            </div>
            <div className="flex flex-wrap gap-2">
              {customization?.enabled ? (
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => void deactivate()}
                  isLoading={pendingAction === "deactivate"}
                >
                  Deactivate
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => void enableOrReactivate()}
                  isLoading={pendingAction === "reactivate"}
                >
                  {customization ? "Reactivate" : "Set up customization"}
                </Button>
              )}
              {customization && !customization.enabled ? (
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete permanently
                </Button>
              ) : null}
            </div>
          </div>

          {customization?.enabled ? (
            <div className="border-t border-ui-border-base px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border border-ui-border-base bg-ui-bg-subtle p-4">
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                  <Text size="small">
                    Canvas: {customization.canvasWidthPx} x{" "}
                    {customization.canvasHeightPx}
                  </Text>
                  <Text size="small">Layers: {customization.layerCount}</Text>
                  <Text size="small">
                    Fields: {customization.formFieldCount}
                  </Text>
                </div>
                <Button variant="secondary" size="small" asChild>
                  <Link to={`/products/${product.id}/customization`}>
                    <Play className="h-4 w-4" />
                    Open editor
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Container>

      <CustomizationBackgroundModal
        product={product}
        mode="activate"
        variantIds={product.variants.map((variant) => variant.id)}
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onSaved={setNextProduct}
        onRevisionConflict={mutate}
      />
      <CustomizationBackgroundModal
        product={product}
        mode="repair"
        variantIds={repairVariantIds ?? []}
        open={repairVariantIds !== null}
        onOpenChange={(open) => {
          if (!open) setRepairVariantIds(null);
        }}
        onSaved={setNextProduct}
        onRevisionConflict={mutate}
      />
      <FocusModal open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Heading level="h2">Delete customization permanently</Heading>
          </FocusModal.Header>
          <FocusModal.Body className="px-6 py-6">
            <Text size="small">
              This removes the saved template and all Customization Backgrounds.
              This cannot be undone.
            </Text>
          </FocusModal.Body>
          <FocusModal.Footer>
            <div className="flex w-full justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={pendingAction === "delete"}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => void permanentlyDelete()}
                isLoading={pendingAction === "delete"}
              >
                Delete customization permanently
              </Button>
            </div>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>
    </>
  );
}
