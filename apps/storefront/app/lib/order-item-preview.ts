export type OrderItemPreviewCustomization = {
  fieldId: string;
  label: string;
  valueSummary: string;
};

export function getOrderItemPreviewCustomizationValues(
  values: OrderItemPreviewCustomization[],
): OrderItemPreviewCustomization[] {
  return values.filter((entry) => entry.valueSummary.trim().length > 0);
}

export function selectOrderItemPreview<T>(items: T[], index: number): T | null {
  return items[index] ?? null;
}
