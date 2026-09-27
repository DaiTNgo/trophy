import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProductOptionGroups } from "../components/product/ProductOptionGroups";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("ProductOptionGroups", () => {
  it("renders text buttons for default/text options", () => {
    const html = renderToStaticMarkup(
      createElement(ProductOptionGroups, {
        options: [
          {
            id: 1,
            productId: 10,
            title: "Kích thước",
            position: 1,
            displayType: "text",
            values: [
              { id: 101, optionId: 1, value: "Nhỏ", position: 1 },
              { id: 102, optionId: 1, value: "Lớn", position: 2 },
            ],
          },
        ],
        selectedOptionValueIds: new Map([[1, 101]]),
        locale: "vi",
        isAvailable: () => true,
        onSelect: () => {},
      }),
    );

    expect(html).toContain("Kích thước");
    expect(html).toContain("Nhỏ");
    expect(html).toContain("Lớn");
    expect(html).toContain('data-selected="true"');
    expect(html).not.toContain('role="radio"');
  });

  it("renders circular color swatches accompanied by text labels when displayType is color", () => {
    const html = renderToStaticMarkup(
      createElement(ProductOptionGroups, {
        options: [
          {
            id: 2,
            productId: 10,
            title: "Màu sắc",
            position: 2,
            displayType: "color",
            values: [
              {
                id: 201,
                optionId: 2,
                value: "Đỏ",
                position: 1,
                colorHex: "#e11d48",
              },
              {
                id: 202,
                optionId: 2,
                value: "Xanh",
                position: 2,
                colorHex: "#2563eb",
              },
            ],
          },
        ],
        selectedOptionValueIds: new Map([[2, 201]]),
        locale: "vi",
        isAvailable: (_optId, valId) => valId === 201,
        onSelect: () => {},
      }),
    );

    expect(html).toContain("Màu sắc");
    expect(html).toContain("Đỏ");
    expect(html).toContain("Xanh");
    expect(html).toContain("background-color:#e11d48");
    expect(html).toContain("background-color:#2563eb");
    expect(html).toContain("ring-brand-strong");
    // valId 202 is not available -> disabled
    expect(html).toContain('disabled=""');
  });

  it("renders image thumbnail swatches accompanied by text labels when displayType is image", () => {
    const html = renderToStaticMarkup(
      createElement(ProductOptionGroups, {
        options: [
          {
            id: 3,
            productId: 10,
            title: "Chất liệu",
            position: 3,
            displayType: "image",
            values: [
              {
                id: 301,
                optionId: 3,
                value: "Gỗ sồi",
                position: 1,
                swatchAssetUrl: "https://example.com/assets/oak.png",
              },
              {
                id: 302,
                optionId: 3,
                value: "Kim loại",
                position: 2,
                swatchAssetUrl: null,
              },
            ],
          },
        ],
        selectedOptionValueIds: new Map([[3, 301]]),
        locale: "vi",
        isAvailable: () => true,
        onSelect: () => {},
      }),
    );

    expect(html).toContain("Chất liệu");
    expect(html).toContain("Gỗ sồi");
    expect(html).toContain("Kim loại");
    expect(html).toContain('src="https://example.com/assets/oak.png"');
    // Fallback for item without swatchAssetUrl: first 2 characters
    expect(html).toContain("KI");
  });

  it("renders pivotable option with dashed border, muted text, and active clickability", () => {
    const html = renderToStaticMarkup(
      createElement(ProductOptionGroups, {
        options: [
          {
            id: 1,
            productId: 10,
            title: "Size",
            position: 1,
            displayType: "text",
            values: [
              { id: 101, optionId: 1, value: "S", position: 1 },
              { id: 102, optionId: 1, value: "M", position: 2 },
            ],
          },
        ],
        selectedOptionValueIds: new Map([[1, 101]]),
        locale: "vi",
        getOptionValueStatus: (_optId, valId) =>
          valId === 101 ? "available" : "pivotable",
        onSelect: () => {},
      }),
    );

    // M should be marked pivotable
    expect(html).toContain('data-status="pivotable"');
    expect(html).toContain("border-dashed");
    expect(html).toContain("text-text-muted");
    // S should be selected
    expect(html).toContain('data-status="available"');
    expect(html).toContain('data-selected="true"');
  });

  it("renders disabled status with disabled attribute and reduced opacity", () => {
    const html = renderToStaticMarkup(
      createElement(ProductOptionGroups, {
        options: [
          {
            id: 1,
            productId: 10,
            title: "Size",
            position: 1,
            displayType: "text",
            values: [
              { id: 103, optionId: 1, value: "XL", position: 3 },
            ],
          },
        ],
        selectedOptionValueIds: new Map(),
        locale: "vi",
        getOptionValueStatus: () => "disabled" as const,
        onSelect: () => {},
      }),
    );

    expect(html).toContain('data-status="disabled"');
    expect(html).toContain('disabled=""');
    expect(html).toContain("cursor-not-allowed");
  });
});

