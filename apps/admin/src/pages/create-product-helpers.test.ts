import { describe, expect, it } from "vitest";
import type { ProductVariant } from "../types";
import {
  createEmptyEmbeddedCustomizationDraft,
  getCustomizationTabRequirement,
  getPreviewBackgrounds,
  getSubmittedCustomization,
  hasEmbeddedCustomizationDraft,
  resolveSelectedPreviewBackground,
  createInitialSectionEditors,
  updateSectionEditorValue,
} from "./create-product-helpers";

const buildVariant = ({
  media = [],
  customizationMedia = null,
}: {
  media?: ProductVariant["media"];
  customizationMedia?: ProductVariant["customizationMedia"];
}): ProductVariant => ({
  id: "variant_1",
  title: "Default",
  sku: "SKU-1",
  price: 100,
  inventory: 10,
  options: [],
  attributes: [],
  allowBackorder: false,
  media,
  customizationMedia,
  shouldCreate: true,
});

describe("create product helpers", () => {
  it("blocks customization tab when a created variant has no customization media", () => {
    const result = getCustomizationTabRequirement({
      customizationEnabled: true,
      createdVariantRows: [buildVariant({ media: [] })],
    });

    expect(result).toEqual({
      ready: false,
      message: "Upload Customization Media for every created variant before opening Customization.",
    });
  });

  it("blocks customization tab when customization media dimensions differ", () => {
    const result = getCustomizationTabRequirement({
      customizationEnabled: true,
      createdVariantRows: [
        buildVariant({
          customizationMedia: {
              id: "asset_1",
              fileName: "a.png",
              mimeType: "image/png",
              widthPx: 1200,
              heightPx: 900,
              byteSize: 10,
              contentUrl: "/a.png",
          },
        }),
        {
          ...buildVariant({
            customizationMedia: {
                id: "asset_2",
                fileName: "b.png",
                mimeType: "image/png",
                widthPx: 1000,
                heightPx: 900,
                byteSize: 10,
                contentUrl: "/b.png",
            },
          }),
          id: "variant_2",
        },
      ],
    });

    expect(result).toEqual({
      ready: false,
      message: "All Customization Media assets must share the same dimensions before opening Customization.",
    });
  });

  it("switches preview background based on selected asset id", () => {
    const backgrounds = getPreviewBackgrounds([
      buildVariant({
        customizationMedia: {
            id: "asset_1",
            fileName: "a.png",
            mimeType: "image/png",
            widthPx: 1200,
            heightPx: 900,
            byteSize: 10,
            contentUrl: "/a.png",
        },
      }),
      {
        ...buildVariant({
          customizationMedia: {
            id: "asset_2",
            fileName: "b.png",
            mimeType: "image/png",
            widthPx: 1200,
            heightPx: 900,
            byteSize: 10,
            contentUrl: "/b.png",
          },
        }),
        id: "variant_2",
      },
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

  describe("product sections state preservation", () => {
    it("initializes empty section editors when form values are empty", () => {
      const editors = createInitialSectionEditors();

      expect(editors.whyThisProductHtml).toEqual({
        vi: { html: "", json: null },
        en: { html: "", json: null },
      });
      expect(editors.specificationsHtml).toEqual({
        vi: { html: "", json: null },
        en: { html: "", json: null },
      });
      expect(editors.shippingHtml).toEqual({
        vi: { html: "", json: null },
        en: { html: "", json: null },
      });
    });

    it("initializes section editors with existing form values", () => {
      const editors = createInitialSectionEditors({
        whyThisProductHtml: { vi: "<p>Ly do chon</p>", en: "<p>Why choose</p>" },
        specificationsHtml: { vi: "<p>Thong so</p>", en: "" },
        shippingHtml: { vi: "", en: "" },
      });

      expect(editors.whyThisProductHtml).toEqual({
        vi: { html: "<p>Ly do chon</p>", json: null },
        en: { html: "<p>Why choose</p>", json: null },
      });
      expect(editors.specificationsHtml).toEqual({
        vi: { html: "<p>Thong so</p>", json: null },
        en: { html: "", json: null },
      });
    });

    it("updates section editor value immutably without clobbering other sections or locales", () => {
      const initial = createInitialSectionEditors({
        whyThisProductHtml: { vi: "<p>Initial VI</p>", en: "<p>Initial EN</p>" },
      });

      const updated = updateSectionEditorValue(
        initial,
        "whyThisProductHtml",
        "vi",
        {
          html: "<p>Updated VI</p>",
          json: JSON.stringify({ type: "doc", content: [] }),
        },
      );

      expect(updated.whyThisProductHtml.vi).toEqual({
        html: "<p>Updated VI</p>",
        json: JSON.stringify({ type: "doc", content: [] }),
      });
      // English content remains untouched
      expect(updated.whyThisProductHtml.en).toEqual({
        html: "<p>Initial EN</p>",
        json: null,
      });
      // Other sections remain untouched
      expect(updated.specificationsHtml).toEqual(initial.specificationsHtml);
      expect(updated.shippingHtml).toEqual(initial.shippingHtml);
    });
  });
});

