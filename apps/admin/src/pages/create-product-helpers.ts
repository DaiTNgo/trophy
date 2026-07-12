import type { BackgroundAsset, ProductCustomization } from "@trophy/customization";
import type { ProductVariant, ProductVariantMedia } from "../types";
import { BACKEND_URL } from "../lib/fetch";

export type EmbeddedCustomizationDraft = Pick<
  ProductCustomization,
  "enabled" | "canvasWidthPx" | "canvasHeightPx" | "layers" | "formFields"
>;

export const createEmptyEmbeddedCustomizationDraft = (): EmbeddedCustomizationDraft => ({
  enabled: true,
  canvasWidthPx: null,
  canvasHeightPx: null,
  layers: [],
  formFields: [],
});

export const hasEmbeddedCustomizationDraft = (draft: EmbeddedCustomizationDraft) =>
  draft.canvasWidthPx !== null ||
  draft.canvasHeightPx !== null ||
  draft.layers.length > 0 ||
  draft.formFields.length > 0;

export const toPreviewBackgroundAsset = (asset: ProductVariantMedia): BackgroundAsset => ({
  assetId: asset.id,
  previewUrl: asset.contentUrl.startsWith("/") 
    ? `${BACKEND_URL.replace(/\/$/, "")}${asset.contentUrl}` 
    : asset.contentUrl,
  filename: asset.fileName,
  mimeType: asset.mimeType,
  widthPx: asset.widthPx,
  heightPx: asset.heightPx,
});

export const getCustomizationTabRequirement = ({
  customizationEnabled,
  createdVariantRows,
}: {
  customizationEnabled: boolean;
  createdVariantRows: ProductVariant[];
}) => {
  if (!customizationEnabled) {
    return { ready: true, message: null as string | null };
  }

  if (createdVariantRows.length === 0) {
    return {
      ready: false,
      message: "Select at least one variant to create before opening Customization.",
    };
  }

  const firstMedia = createdVariantRows[0]?.media[0];

  for (const variant of createdVariantRows) {
    if (variant.media.length === 0) {
      return {
        ready: false,
        message: "Upload at least one image for every created variant before opening Customization.",
      };
    }

    for (const media of variant.media) {
      if (
        firstMedia &&
        (media.widthPx !== firstMedia.widthPx || media.heightPx !== firstMedia.heightPx)
      ) {
        return {
          ready: false,
          message: "All created variant images must share the same dimensions before opening Customization.",
        };
      }
    }
  }

  return { ready: true, message: null as string | null };
};

export const getPreviewBackgrounds = (createdVariantRows: ProductVariant[]) =>
  createdVariantRows.flatMap((variant) => variant.media.map((asset) => toPreviewBackgroundAsset(asset)));

export const resolveSelectedPreviewBackground = ({
  backgrounds,
  selectedAssetId,
}: {
  backgrounds: BackgroundAsset[];
  selectedAssetId: string | null;
}) =>
  backgrounds.find((asset) => asset.assetId === selectedAssetId) ?? backgrounds[0] ?? null;

export const getSubmittedCustomization = ({
  customizationEnabled,
  draft,
}: {
  customizationEnabled: boolean;
  draft: EmbeddedCustomizationDraft;
}) => {
  if (!customizationEnabled) {
    return null;
  }

  return {
    enabled: true,
    canvasWidthPx: draft.canvasWidthPx,
    canvasHeightPx: draft.canvasHeightPx,
    layers: draft.layers,
    formFields: draft.formFields,
  };
};
