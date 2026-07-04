import { describe, expect, it } from "vitest";
import type { ProductVariant } from "../types";
import {
  createEmptyEmbeddedCustomizationDraft,
  getCustomizationTabRequirement,
  getPreviewBackgrounds,
  getSubmittedCustomization,
  hasEmbeddedCustomizationDraft,
  resolveSelectedPreviewBackground,
} from "./create-product-helpers";

const buildVariant = ({
  media,
}: {
  media: ProductVariant["media"];
}): ProductVariant => ({
  id: "variant_1",
  title: "Default",
  sku: "SKU-1",
  price: 100,
  inventory: 10,
  options: [],
  allowBackorder: false,
  media,
  shouldCreate: true,
});

describe("create product helpers", () => {
  it("blocks customization tab when a created variant has no image", () => {
    const result = getCustomizationTabRequirement({
      customizationEnabled: true,
      createdVariantRows: [buildVariant({ media: [] })],
    });

    expect(result).toEqual({
      ready: false,
      message: "Upload at least one image for every created variant before opening Customization.",
    });
  });

  it("blocks customization tab when created variant image dimensions differ", () => {
    const result = getCustomizationTabRequirement({
      customizationEnabled: true,
      createdVariantRows: [
        buildVariant({
          media: [
            {
              id: "asset_1",
              fileName: "a.png",
              mimeType: "image/png",
              widthPx: 1200,
              heightPx: 900,
              byteSize: 10,
              contentUrl: "/a.png",
            },
          ],
        }),
        {
          ...buildVariant({
            media: [
              {
                id: "asset_2",
                fileName: "b.png",
                mimeType: "image/png",
                widthPx: 1000,
                heightPx: 900,
                byteSize: 10,
                contentUrl: "/b.png",
              },
            ],
          }),
          id: "variant_2",
        },
      ],
    });

    expect(result).toEqual({
      ready: false,
      message: "All created variant images must share the same dimensions before opening Customization.",
    });
  });

  it("switches preview background based on selected asset id", () => {
    const backgrounds = getPreviewBackgrounds([
      buildVariant({
        media: [
          {
            id: "asset_1",
            fileName: "a.png",
            mimeType: "image/png",
            widthPx: 1200,
            heightPx: 900,
            byteSize: 10,
            contentUrl: "/a.png",
          },
          {
            id: "asset_2",
            fileName: "b.png",
            mimeType: "image/png",
            widthPx: 1200,
            heightPx: 900,
            byteSize: 10,
            contentUrl: "/b.png",
          },
        ],
      }),
    ]);

    expect(resolveSelectedPreviewBackground({ backgrounds, selectedAssetId: "asset_2" })?.assetId).toBe("asset_2");
    expect(resolveSelectedPreviewBackground({ backgrounds, selectedAssetId: null })?.assetId).toBe("asset_1");
  });

  it("omits customization submission when the switch is disabled but keeps the draft in memory", () => {
    const draft = {
      ...createEmptyEmbeddedCustomizationDraft(),
      canvasWidthPx: 1200,
      canvasHeightPx: 900,
      layers: [{ id: "layer_1" }] as never[],
      formFields: [{ id: "field_1" }] as never[],
    };

    expect(hasEmbeddedCustomizationDraft(draft)).toBe(true);
    expect(
      getSubmittedCustomization({
        customizationEnabled: false,
        draft,
      }),
    ).toBeNull();
  });

  it("includes preserved customization draft in submission when enabled", () => {
    const draft = {
      ...createEmptyEmbeddedCustomizationDraft(),
      canvasWidthPx: 1200,
      canvasHeightPx: 900,
      layers: [{ id: "layer_1" }] as never[],
      formFields: [{ id: "field_1" }] as never[],
    };

    expect(
      getSubmittedCustomization({
        customizationEnabled: true,
        draft,
      }),
    ).toEqual({
      enabled: true,
      canvasWidthPx: 1200,
      canvasHeightPx: 900,
      layers: draft.layers,
      formFields: draft.formFields,
    });
  });
});
