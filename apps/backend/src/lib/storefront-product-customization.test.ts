import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPLATE, type ProductCustomization } from "@trophy/customization";
import {
  buildProductCustomizationTemplate,
  mergeCustomizationValues,
  type StorefrontProductVariant,
} from "../../../storefront/app/lib/product-customization";

const customization: ProductCustomization = {
  productId: "42",
  enabled: true,
  canvasWidthPx: 1200,
  canvasHeightPx: 900,
  layers: DEFAULT_TEMPLATE.layers,
  formFields: DEFAULT_TEMPLATE.formFields,
};

const redVariant: StorefrontProductVariant = {
  id: 101,
  title: "Red",
  media: [
    {
      assetId: "asset-red",
      contentUrl: "https://example.test/red.png",
      fileName: "red.png",
      mimeType: "image/png",
      widthPx: 1200,
      heightPx: 900,
    },
  ],
};

const blueVariant: StorefrontProductVariant = {
  id: 102,
  title: "Blue",
  media: [
    {
      assetId: "asset-blue",
      contentUrl: "https://example.test/blue.png",
      fileName: "blue.png",
      mimeType: "image/png",
      widthPx: 1200,
      heightPx: 900,
    },
  ],
};

describe("storefront product customization helpers", () => {
  it("uses the selected variant first media as the preview background", () => {
    const redTemplate = buildProductCustomizationTemplate({
      productId: 42,
      productTitle: "Fixture Trophy",
      customization,
      selectedVariant: redVariant,
    });
    const blueTemplate = buildProductCustomizationTemplate({
      productId: 42,
      productTitle: "Fixture Trophy",
      customization,
      selectedVariant: blueVariant,
    });

    expect(redTemplate.background?.assetId).toBe("asset-red");
    expect(redTemplate.background?.previewUrl).toBe("https://example.test/red.png");
    expect(blueTemplate.background?.assetId).toBe("asset-blue");
    expect(blueTemplate.background?.previewUrl).toBe("https://example.test/blue.png");
  });

  it("keeps layer placement and shopper values stable while backgrounds switch", () => {
    const redTemplate = buildProductCustomizationTemplate({
      productId: 42,
      productTitle: "Fixture Trophy",
      customization,
      selectedVariant: redVariant,
    });
    const blueTemplate = buildProductCustomizationTemplate({
      productId: 42,
      productTitle: "Fixture Trophy",
      customization,
      selectedVariant: blueVariant,
    });
    const initialValues = mergeCustomizationValues(redTemplate, null);
    initialValues.field_line_1 = { text: "CHAMPION" };

    const mergedValues = mergeCustomizationValues(blueTemplate, initialValues);

    expect(blueTemplate.layers).toEqual(redTemplate.layers);
    expect(blueTemplate.formFields).toEqual(redTemplate.formFields);
    expect(blueTemplate.background?.widthPx).toBe(1200);
    expect(blueTemplate.background?.heightPx).toBe(900);
    expect(mergedValues.field_line_1).toEqual({ text: "CHAMPION" });
  });
});
