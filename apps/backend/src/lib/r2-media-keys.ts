const KEY_SEGMENT_PATTERN = /^[A-Za-z0-9_-]+$/;
const EXTENSION_PATTERN = /^[a-z0-9]+$/;

function keySegment(value: string | number) {
  const normalized = String(value).trim();
  if (!normalized || !KEY_SEGMENT_PATTERN.test(normalized)) {
    throw new Error("R2 key segment contains unsupported characters");
  }
  return normalized;
}

function extension(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!EXTENSION_PATTERN.test(normalized)) {
    throw new Error("R2 object extension contains unsupported characters");
  }
  return normalized;
}

type SourceObject = { extension: string };
type ShopperDraftObject = SourceObject & { draftId: string; fieldId: string; assetId: string };
type CatalogProductObject = SourceObject & { productId: number; assetId: string };
type CatalogVariantObject = CatalogProductObject & { variantId: string | number };
type OrderObject = { orderNumber: string; orderId: number; itemId: number };

export function buildShopperDraftUploadKey({ draftId, fieldId, assetId, extension: fileExtension }: ShopperDraftObject) {
  return `shopper-drafts/${keySegment(draftId)}/uploads/${keySegment(fieldId)}/${keySegment(assetId)}.source.${extension(fileExtension)}`;
}

export function buildCatalogProductMediaKey({ productId, assetId, extension: fileExtension }: CatalogProductObject) {
  return `catalog/products/${keySegment(productId)}/media/${keySegment(assetId)}.source.${extension(fileExtension)}`;
}

export function buildCatalogVariantMediaKey({
  productId,
  variantId,
  assetId,
  extension: fileExtension,
}: CatalogVariantObject) {
  return `catalog/products/${keySegment(productId)}/variants/${keySegment(variantId)}/media/${keySegment(assetId)}.source.${extension(fileExtension)}`;
}

export function buildCatalogVariantCustomizationBackgroundKey({
  productId,
  variantId,
  assetId,
  extension: fileExtension,
}: CatalogVariantObject) {
  return `catalog/products/${keySegment(productId)}/variants/${keySegment(variantId)}/customization-background/${keySegment(assetId)}.source.${extension(fileExtension)}`;
}

export function buildClipartKey({
  categoryId,
  assetId,
  extension: fileExtension,
}: SourceObject & { categoryId: string; assetId: string }) {
  return `clipart/${keySegment(categoryId)}/${keySegment(assetId)}.source.${extension(fileExtension)}`;
}

export function buildBrandFontKey(assetId: string) {
  return `fonts/${keySegment(assetId)}.ttf`;
}

function orderItemPrefix({ orderNumber, orderId, itemId }: OrderObject) {
  return `orders/${keySegment(orderNumber)}-${keySegment(orderId)}/items/${keySegment(itemId)}`;
}

export function buildOrderBackgroundKey({
  orderNumber,
  orderId,
  itemId,
  assetId,
  extension: fileExtension,
}: OrderObject & SourceObject & { assetId: string }) {
  return `${orderItemPrefix({ orderNumber, orderId, itemId })}/background/${keySegment(assetId)}.source.${extension(fileExtension)}`;
}

export function buildOrderUploadKey({
  orderNumber,
  orderId,
  itemId,
  fieldId,
  assetId,
  extension: fileExtension,
}: OrderObject & SourceObject & { fieldId: string; assetId: string }) {
  return `${orderItemPrefix({ orderNumber, orderId, itemId })}/uploads/${keySegment(fieldId)}/${keySegment(assetId)}.source.${extension(fileExtension)}`;
}

export function buildOrderClipartKey({
  orderNumber,
  orderId,
  itemId,
  fieldId,
  sourceAssetId,
  extension: fileExtension,
}: OrderObject & SourceObject & { fieldId: string; sourceAssetId: string }) {
  return `${orderItemPrefix({ orderNumber, orderId, itemId })}/clipart/${keySegment(fieldId)}/${keySegment(sourceAssetId)}.source.${extension(fileExtension)}`;
}
