import { describe, expect, it } from "vitest";
import {
  validateProductTitle,
  isAttributeRowActive,
  validateProductAttributes,
  validateProductOptionDraft,
  validateCreateProduct,
} from "./product-utils";
import type { CreateProductFormValues, ProductAttribute } from "../types";

describe("Unified product validation (vi & en)", () => {
  describe("validateProductTitle", () => {
    it("accepts title with Vietnamese text only", () => {
      expect(validateProductTitle({ vi: "Cúp pha lê", en: "" })).toBeNull();
    });

    it("accepts title with both Vietnamese and English text", () => {
      expect(
        validateProductTitle({ vi: "Cúp pha lê", en: "Crystal Trophy" }),
      ).toBeNull();
    });

    it("rejects title when Vietnamese is empty, even if English is provided", () => {
      expect(validateProductTitle({ vi: "", en: "Crystal Trophy" })).toBe(
        "Vietnamese product title is required.",
      );
      expect(validateProductTitle({ vi: "   ", en: "Crystal Trophy" })).toBe(
        "Vietnamese product title is required.",
      );
    });

    it("rejects title when both Vietnamese and English are empty", () => {
      expect(validateProductTitle({ vi: "", en: "" })).toBe(
        "Vietnamese product title is required.",
      );
      expect(validateProductTitle(null)).toBe(
        "Vietnamese product title is required.",
      );
    });
  });

  describe("isAttributeRowActive", () => {
    it("returns false when all fields are empty or whitespace", () => {
      expect(
        isAttributeRowActive({
          key: { vi: "", en: "" },
          value: { vi: "  ", en: "" },
        }),
      ).toBe(false);
    });

    it("returns true when any field has content", () => {
      expect(
        isAttributeRowActive({
          key: { vi: "Chất liệu", en: "" },
          value: { vi: "", en: "" },
        }),
      ).toBe(true);
      expect(
        isAttributeRowActive({
          key: { vi: "", en: "Material" },
          value: { vi: "", en: "" },
        }),
      ).toBe(true);
      expect(
        isAttributeRowActive({
          key: { vi: "", en: "" },
          value: { vi: "Pha lê", en: "" },
        }),
      ).toBe(true);
      expect(
        isAttributeRowActive({
          key: { vi: "", en: "" },
          value: { vi: "", en: "Crystal" },
        }),
      ).toBe(true);
    });
  });

  describe("validateProductAttributes", () => {
    it("passes when all attribute rows are blank", () => {
      const attributes: ProductAttribute[] = [
        { key: { vi: "", en: "" }, value: { vi: "", en: "" } },
      ];
      expect(validateProductAttributes(attributes)).toBeNull();
    });

    it("passes when active rows have both Vietnamese name and value", () => {
      const attributes: ProductAttribute[] = [
        {
          key: { vi: "Chất liệu", en: "Material" },
          value: { vi: "Pha lê", en: "Crystal" },
        },
        {
          key: { vi: "Kích thước", en: "" },
          value: { vi: "20cm", en: "" },
        },
      ];
      expect(validateProductAttributes(attributes)).toBeNull();
    });

    it("rejects when an active row is missing Vietnamese name", () => {
      const attributes: ProductAttribute[] = [
        {
          key: { vi: "", en: "Material" },
          value: { vi: "Pha lê", en: "Crystal" },
        },
      ];
      expect(validateProductAttributes(attributes)).toBe(
        "Each attribute row must have both a Vietnamese name and value.",
      );
    });

    it("rejects when an active row is missing Vietnamese value", () => {
      const attributes: ProductAttribute[] = [
        {
          key: { vi: "Chất liệu", en: "Material" },
          value: { vi: "", en: "Crystal" },
        },
      ];
      expect(validateProductAttributes(attributes)).toBe(
        "Each attribute row must have both a Vietnamese name and value.",
      );
    });

    it("rejects when an active row has only English in both name and value", () => {
      const attributes: ProductAttribute[] = [
        {
          key: { vi: "", en: "Material" },
          value: { vi: "", en: "Crystal" },
        },
      ];
      expect(validateProductAttributes(attributes)).toBe(
        "Each attribute row must have both a Vietnamese name and value.",
      );
    });
  });

  describe("validateProductOptionDraft", () => {
    it("passes with valid Vietnamese title and unique Vietnamese values", () => {
      expect(
        validateProductOptionDraft({
          titleTranslations: { vi: "Kích thước", en: "Size" },
          values: [
            { valueTranslations: { vi: "Nhỏ", en: "Small" } },
            { valueTranslations: { vi: "Lớn", en: "Large" } },
          ],
        }),
      ).toBeNull();
    });

    it("passes when English translations are omitted", () => {
      expect(
        validateProductOptionDraft({
          titleTranslations: { vi: "Màu sắc", en: "" },
          values: [
            { valueTranslations: { vi: "Vàng", en: "" } },
            { valueTranslations: { vi: "Bạc", en: "" } },
          ],
        }),
      ).toBeNull();
    });

    it("rejects when Vietnamese option title is missing", () => {
      expect(
        validateProductOptionDraft({
          titleTranslations: { vi: "", en: "Size" },
          values: [{ valueTranslations: { vi: "Nhỏ", en: "Small" } }],
        }),
      ).toBe("Vietnamese option title is required.");
    });

    it("rejects when values list is empty", () => {
      expect(
        validateProductOptionDraft({
          titleTranslations: { vi: "Kích thước", en: "" },
          values: [],
        }),
      ).toBe("At least one variation value is required.");
    });

    it("rejects when any value is missing Vietnamese name", () => {
      expect(
        validateProductOptionDraft({
          titleTranslations: { vi: "Kích thước", en: "" },
          values: [
            { valueTranslations: { vi: "Nhỏ", en: "Small" } },
            { valueTranslations: { vi: "", en: "Large" } },
          ],
        }),
      ).toBe("Each option value requires a Vietnamese name.");
    });

    it("rejects duplicate values in Vietnamese (case-insensitive)", () => {
      expect(
        validateProductOptionDraft({
          titleTranslations: { vi: "Màu sắc", en: "" },
          values: [
            { valueTranslations: { vi: "Đỏ", en: "Red" } },
            { valueTranslations: { vi: "đỏ", en: "Crimson" } },
          ],
        }),
      ).toBe("Values within the same option must be unique.");
    });
  });

  describe("validateCreateProduct integration", () => {
    const baseValues: CreateProductFormValues = {
      title: { vi: "Cúp thể thao", en: "Sports Trophy" },
      handle: "cup-the-thao",
      subtitle: { vi: "", en: "" },
      description: { vi: "", en: "" },
      whyThisProductHtml: { vi: "", en: "" },
      specificationsHtml: { vi: "", en: "" },
      shippingHtml: { vi: "", en: "" },
      customizationEnabled: false,
      collection: "",
      categories: [],
      media: "",
      hasVariants: false,
      basePrice: "100000",
      inventory: "10",
      optionNameOne: "",
      optionValuesOne: "",
      optionNameTwo: "",
      optionValuesTwo: "",
    };

    it("fails when Vietnamese title is missing", () => {
      const errors = validateCreateProduct({
        mode: "draft",
        values: { ...baseValues, title: { vi: "", en: "English Only" } },
        attributes: [],
        products: [],
      });
      expect(errors.title).toBe("Vietnamese title is required.");
    });

    it("fails when attribute row is missing Vietnamese name", () => {
      const errors = validateCreateProduct({
        mode: "draft",
        values: baseValues,
        attributes: [
          {
            key: { vi: "", en: "Origin" },
            value: { vi: "Việt Nam", en: "Vietnam" },
          },
        ],
        products: [],
      });
      expect(errors.attributes).toBe(
        "Each attribute row must have both a Vietnamese name and value.",
      );
    });

    it("fails when variants option has missing Vietnamese value", () => {
      const errors = validateCreateProduct({
        mode: "draft",
        values: { ...baseValues, hasVariants: true },
        attributes: [],
        products: [],
        optionDefinitions: [
          {
            id: "opt_1",
            title: "Kích thước",
            titleTranslations: { vi: "Kích thước", en: "Size" },
            values: [
              {
                id: "val_1",
                value: "Nhỏ",
                valueTranslations: { vi: "Nhỏ", en: "Small" },
              },
              {
                id: "val_2",
                value: "",
                valueTranslations: { vi: "", en: "Large" },
              },
            ],
          },
        ],
      });
      expect(errors.optionDefinitions).toBe(
        "Each option value requires a Vietnamese name.",
      );
    });

    it("fails when variants option has duplicate Vietnamese values", () => {
      const errors = validateCreateProduct({
        mode: "draft",
        values: { ...baseValues, hasVariants: true },
        attributes: [],
        products: [],
        optionDefinitions: [
          {
            id: "opt_1",
            title: "Màu sắc",
            titleTranslations: { vi: "Màu sắc", en: "Color" },
            values: [
              {
                id: "val_1",
                value: "Vàng",
                valueTranslations: { vi: "Vàng", en: "Gold" },
              },
              {
                id: "val_2",
                value: "vàng",
                valueTranslations: { vi: "vàng", en: "Yellow" },
              },
            ],
          },
        ],
      });
      expect(errors.optionDefinitions).toBe(
        "Values within the same option must be unique.",
      );
    });
  });
});
