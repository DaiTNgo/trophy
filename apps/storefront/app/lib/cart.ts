export const CART_STORAGE_KEY = "trophy-storefront-cart";

export type CartCustomizationSummary = {
  fieldId: string;
  label: string;
  valueSummary: string;
};

export type CartLine = {
  id: string;
  productId: number;
  variantId: number;
  quantity: number;
  customizationValues: Record<string, unknown> | null;
  customizationSummary: CartCustomizationSummary[];
  display: {
    productTitle: string;
    productHandle: string;
    variantTitle: string;
    sku: string | null;
    thumbnail: string | null;
    priceAmount: number | null;
    customizable: boolean;
    requiresCustomization: boolean;
    isContactPrice: boolean;
  };
};

export type AddCartLineInput = Omit<CartLine, "id">;

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`).join(",")}}`;
  }

  return JSON.stringify(value);
}

export function buildCartLineSignature(
  line: Pick<CartLine, "productId" | "variantId" | "customizationValues">,
) {
  return `${line.productId}:${line.variantId}:${stableStringify(line.customizationValues ?? null)}`;
}

export function addCartLine(
  current: CartLine[],
  input: AddCartLineInput,
  createId: () => string,
) {
  const signature = buildCartLineSignature(input);
  const existingIndex = current.findIndex((line) => buildCartLineSignature(line) === signature);

  if (existingIndex >= 0) {
    const next = [...current];
    next[existingIndex] = {
      ...next[existingIndex],
      quantity: next[existingIndex].quantity + input.quantity,
      display: input.display,
      customizationSummary: input.customizationSummary,
    };
    return next;
  }

  return [...current, { ...input, id: createId() }];
}

export function updateCartLineQuantity(current: CartLine[], lineId: string, quantity: number) {
  return current.flatMap((line) => {
    if (line.id !== lineId) {
      return [line];
    }

    if (quantity <= 0) {
      return [];
    }

    return [{ ...line, quantity }];
  });
}

export function removeCartLine(current: CartLine[], lineId: string) {
  return current.filter((line) => line.id !== lineId);
}

export function getCartItemCount(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function serializeCartLines(lines: CartLine[]) {
  return JSON.stringify(lines);
}

export function deserializeCartLines(raw: string | null) {
  if (!raw) {
    return [] as CartLine[];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    return [] as CartLine[];
  }
}
