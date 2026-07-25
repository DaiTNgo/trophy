import { describe, expect, it } from "vitest";
import {
  getOrderItemPreviewCustomizationValues,
  selectOrderItemPreview,
} from "./order-item-preview";

describe("order item preview helpers", () => {
  it("keeps the selected line independent when product titles repeat", () => {
    const items = [
      { productTitle: "Custom Cup", variantTitle: "Blue", customization: "Alice" },
      { productTitle: "Custom Cup", variantTitle: "Red", customization: "Bob" },
    ];

    expect(selectOrderItemPreview(items, 1)).toEqual(items[1]);
  });

  it("returns null for an item index that does not exist", () => {
    expect(selectOrderItemPreview(["item"], 2)).toBeNull();
  });

  it("hides empty customization values", () => {
    expect(
      getOrderItemPreviewCustomizationValues([
        { fieldId: "name", label: "Tên", valueSummary: "Alice" },
        { fieldId: "note", label: "Ghi chú", valueSummary: "   " },
      ]),
    ).toEqual([{ fieldId: "name", label: "Tên", valueSummary: "Alice" }]);
  });
});
