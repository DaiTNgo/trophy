import type {
  CustomizationFieldValue,
  CustomizationFormField,
  CustomizationFormValues,
} from "@trophy/customization";

export type OrderAddressSnapshot = {
  line1: string;
  line2?: string;
  city: string;
  province?: string;
  postalCode?: string;
  country: string;
};

export type DifferentShippingAddressSnapshot = {
  recipientName: string;
  recipientPhone: string;
  address: OrderAddressSnapshot;
};

export type StoredProductSnapshot = {
  id: number;
  title: string;
  handle: string;
  status: string;
};

export type StoredVariantSnapshot = {
  id: number;
  title: string;
  sku: string | null;
  priceAmount: number | null;
};

export type StoredBackgroundSnapshot = {
  assetId: string;
  previewUrl: string;
  widthPx: number | null;
  heightPx: number | null;
};

export type StoredCustomizationSnapshot = {
  values: CustomizationFormValues;
  design: object;
  templateSnapshot: {
    layers: unknown[];
    formFields: CustomizationFormField[];
    canvasWidthPx: number | null;
    canvasHeightPx: number | null;
  };
};

export type CustomizationValueSummary = {
  fieldId: string;
  label: string;
  valueSummary: string;
};

function safeParseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function normalizePhoneForLookup(value: string) {
  return value.replace(/\D+/g, "");
}

export function maskPhone(value: string) {
  const normalized = normalizePhoneForLookup(value);
  if (normalized.length <= 4) {
    return normalized;
  }

  return `${"*".repeat(Math.max(0, normalized.length - 4))}${normalized.slice(-4)}`;
}

export function parseOrderAddress(value: string) {
  return safeParseJson<OrderAddressSnapshot>(value);
}

export function parseDifferentShippingAddress(value: string | null) {
  return safeParseJson<DifferentShippingAddressSnapshot>(value);
}

export function parseProductSnapshot(value: string) {
  return safeParseJson<StoredProductSnapshot>(value);
}

export function parseVariantSnapshot(value: string) {
  return safeParseJson<StoredVariantSnapshot>(value);
}

export function parseBackgroundSnapshot(value: string | null) {
  return safeParseJson<StoredBackgroundSnapshot>(value);
}

export function parseCustomizationSnapshot(value: string | null) {
  return safeParseJson<StoredCustomizationSnapshot>(value);
}

function summarizeCustomizationValue(value: CustomizationFieldValue) {
  if (!value) {
    return "No value";
  }

  if (typeof value === "object" && "text" in value && typeof value.text === "string") {
    return value.text;
  }

  if (typeof value === "object" && "assetId" in value) {
    return "Uploaded image";
  }

  if (typeof value === "object" && "source" in value && value.source === "icon") {
    return typeof (value as { iconName?: unknown }).iconName === "string"
      ? (value as { iconName: string }).iconName
      : "Selected icon";
  }

  return "Custom value";
}

export function buildCustomizationValueSummaries(
  snapshot: StoredCustomizationSnapshot | null,
): CustomizationValueSummary[] {
  if (!snapshot) {
    return [];
  }

  const labelsByFieldId = new Map(
    snapshot.templateSnapshot.formFields.map((field) => [field.id, field.label]),
  );

  return Object.entries(snapshot.values).map(([fieldId, value]) => ({
    fieldId,
    label: labelsByFieldId.get(fieldId) ?? fieldId,
    valueSummary: summarizeCustomizationValue(value),
  }));
}
