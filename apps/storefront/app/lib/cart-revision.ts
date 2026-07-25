import type { CartLine } from "./cart";
import { getGenericProductPath } from "./storefront-paths";

export const CART_LINE_REVISION_PARAM = "cartLine";

export function canReviseCartLine(line: Pick<CartLine, "display">) {
  return line.display.customizable;
}

export function getCartLineRevisionPath(productHandle: string, cartLineId: string) {
  const searchParams = new URLSearchParams({ [CART_LINE_REVISION_PARAM]: cartLineId });
  return `${getGenericProductPath(productHandle)}?${searchParams.toString()}`;
}

export function getCartLineRevision(
  lines: CartLine[],
  cartLineId: string | null,
  productId: number,
) {
  if (!cartLineId) {
    return null;
  }

  return lines.find((line) => line.id === cartLineId && line.productId === productId) ?? null;
}

export function resolveCartLineRevision({
  lines,
  cartLineId,
  productId,
  variantIds,
}: {
  lines: CartLine[];
  cartLineId: string | null;
  productId: number;
  variantIds: number[];
}) {
  if (!cartLineId) {
    return { status: "none" as const, line: null };
  }

  const line = getCartLineRevision(lines, cartLineId, productId);
  if (!line) {
    return { status: "missing" as const, line: null };
  }

  return variantIds.includes(line.variantId)
    ? { status: "restored" as const, line }
    : { status: "variant_missing" as const, line };
}
