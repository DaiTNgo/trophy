import { Hono } from 'hono'
import { upsertTranslations } from '../../lib/catalog-translation'
import { getDb } from '../../db/client'
import {
  productVariantCustomizationMedia,
  productVariantMedia,
  productVariantOptionValues,
  productVariants
} from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseJson, parseParams } from '../../lib/validation'
import { ensureVariantAssetIdsExist, updateProductTimestamp } from './product-guards'
import { loadProductAssetsById } from './product-media'
import { syncMisaProductVariants } from './product-misa-sync'
import { replaceVariantAttributes } from './product-mutations'
import { productUsesVariantMode } from './product-publishability'
import { readProduct } from './product-reader'
import { variantCreateSchema, idParamsSchema } from './product-schemas'
import { validateVariantSelectionForProduct } from './product-variant-selection'

const nowIso = () => new Date().toISOString()

const defaultLocalizedText = (value: string) => ({ vi: value, en: value })

const localizedInputValue = (value: string | { vi: string }) =>
  typeof value === 'string' ? value : value.vi

export const productVariantCreateRoute = new Hono<AppEnv>().post('/:id/variants', async (c) => {
  const params = parseParams(c, idParamsSchema)
  if (!params.success) return params.response

  const parsed = await parseJson(c, variantCreateSchema)
  if (!parsed.success) return parsed.response

  const db = getDb(c.env)
  const product = await readProduct(c, db, params.output.id)
  if (!product) return jsonError(c, 404, 'Product not found')

  if (!productUsesVariantMode(product) && product.variants.length >= 1) {
    return jsonError(c, 409, 'Define product options before creating multiple variants')
  }

  const optionValueIds = [...new Set(parsed.output.optionValueIds ?? [])].sort((a, b) => a - b)
  const selectionError = await validateVariantSelectionForProduct({
    db,
    productId: product.id,
    optionValueIds
  })
  if (selectionError) return jsonError(c, selectionError.status, selectionError.error)

  const assetIds = [
    ...new Set([
      ...(parsed.output.media ?? []).map((item) => item.assetId),
      ...(parsed.output.customizationMedia?.assetId
        ? [parsed.output.customizationMedia.assetId]
        : [])
    ])
  ]
  const missingAssets = await ensureVariantAssetIdsExist(db, assetIds)
  if (missingAssets) return jsonError(c, missingAssets.status, missingAssets.error)

  if (product.status === 'published' && parsed.output.priceAmount === null) {
    return jsonError(c, 409, 'Every variant must have a price before publish')
  }

  if (
    product.status === 'published' &&
    product.customization?.enabled &&
    !parsed.output.customizationMedia?.assetId
  ) {
    return jsonError(c, 409, 'Each variant needs Customization Media before publish')
  }

  if (product.status === 'published' && product.customization?.enabled) {
    const nextAsset = await loadProductAssetsById(db, [parsed.output.customizationMedia!.assetId])
    const dimensions = nextAsset.get(parsed.output.customizationMedia!.assetId)
    const expected = product.variants.find((item) => item.customizationMedia)?.customizationMedia
    if (!dimensions?.widthPx || !dimensions.heightPx) {
      return jsonError(c, 409, 'Customization Media must have valid dimensions before publish')
    }
    if (
      expected &&
      (dimensions.widthPx !== expected.widthPx || dimensions.heightPx !== expected.heightPx)
    ) {
      return jsonError(
        c,
        409,
        'Customization Media must match the existing canvas size before publish'
      )
    }
  }

  const insertedVariant = await db
    .insert(productVariants)
    .values({
      productId: product.id,
      title: localizedInputValue(parsed.output.title),
      sku: parsed.output.sku ?? null,
      priceAmount: parsed.output.priceAmount ?? null,
      inventoryQuantity: parsed.output.inventoryQuantity ?? 0,
      allowBackorder: parsed.output.allowBackorder ?? false,
      isDefault: false,
      position: product.variants.length,
      updatedAt: nowIso()
    })
    .returning()
    .get()

  await upsertTranslations(
    db,
    'product_variant',
    String(insertedVariant.id),
    'title',
    typeof parsed.output.title === 'string'
      ? defaultLocalizedText(parsed.output.title)
      : parsed.output.title
  )

  if (optionValueIds.length > 0) {
    await db.insert(productVariantOptionValues).values(
      optionValueIds.map((optionValueId) => ({
        variantId: insertedVariant.id,
        optionValueId
      }))
    )
  }

  const galleryAssetIds = [...new Set((parsed.output.media ?? []).map((item) => item.assetId))]
  if (galleryAssetIds.length > 0) {
    await db.insert(productVariantMedia).values(
      galleryAssetIds.map((assetId, index) => ({
        variantId: insertedVariant.id,
        assetId,
        position: index
      }))
    )
  }

  if (parsed.output.customizationMedia?.assetId) {
    await db.insert(productVariantCustomizationMedia).values({
      variantId: insertedVariant.id,
      assetId: parsed.output.customizationMedia.assetId
    })
  }

  await replaceVariantAttributes(db, insertedVariant.id, parsed.output.attributes ?? [])
  await updateProductTimestamp(db, product.id)

  const nextProduct = await readProduct(c, db, product.id)
  if (nextProduct && product.status === 'published') {
    const inserted = nextProduct.variants.find((item) => item.id === insertedVariant.id)
    if (inserted) await syncMisaProductVariants(c, db, nextProduct, [inserted])
  }
  const syncedProduct =
    product.status === 'published' ? await readProduct(c, db, product.id) : nextProduct
  return c.json({ item: syncedProduct }, 201)
})
