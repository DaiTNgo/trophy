import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { getDb } from '../../db/client'
import {
  productAssets,
  productVariantCustomizationMedia,
  productVariantMedia
} from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { toAbsoluteAssetUrl } from '../../lib/url'
import { jsonError, parseJson, parseParams } from '../../lib/validation'
import { updateProductTimestamp } from './product-guards'
import { loadProductAssetsById } from './product-media'
import { validatePublishable } from './product-publishability'
import { readProduct } from './product-reader'
import {
  variantCustomizationMediaSchema,
  variantMediaSchema,
  variantParamsSchema
} from './product-schemas'

const nowIso = () => new Date().toISOString()

export const productVariantMediaRoute = new Hono<AppEnv>()
  .put('/:id/variants/:variantId/customization-media', async (c) => {
    const params = parseParams(c, variantParamsSchema)
    if (!params.success) return params.response

    const parsed = await parseJson(c, variantCustomizationMediaSchema)
    if (!parsed.success) return parsed.response

    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')
    if (!product.customization?.enabled) {
      return jsonError(c, 409, 'Customization is disabled for this product')
    }

    const variant = product.variants.find((item) => item.id === params.output.variantId)
    if (!variant) return jsonError(c, 404, 'Variant not found')

    const asset = await db
      .select()
      .from(productAssets)
      .where(eq(productAssets.id, parsed.output.assetId))
      .get()
    if (!asset) return jsonError(c, 404, 'Customization Media asset not found')
    if (!asset.widthPx || !asset.heightPx) {
      return jsonError(c, 422, 'Customization Media must have valid dimensions')
    }

    const otherCanvas = product.variants.find(
      (item) => item.id !== variant.id && item.customizationMedia
    )?.customizationMedia
    if (
      otherCanvas &&
      (asset.widthPx !== otherCanvas.widthPx || asset.heightPx !== otherCanvas.heightPx)
    ) {
      return jsonError(c, 409, 'Customization Media must match the existing canvas size')
    }

    if (product.status === 'published') {
      const candidate = {
        ...product,
        variants: product.variants.map((item) =>
          item.id === variant.id ? { ...item, customizationMedia: asset } : item
        )
      }
      const publishError = validatePublishable(
        candidate as NonNullable<Awaited<ReturnType<typeof readProduct>>>
      )
      if (publishError) return jsonError(c, 409, publishError)
    }

    const previousAssetId = variant.customizationMedia?.id ?? null
    await db
      .delete(productVariantCustomizationMedia)
      .where(eq(productVariantCustomizationMedia.variantId, variant.id))
    await db.insert(productVariantCustomizationMedia).values({
      variantId: variant.id,
      assetId: asset.id,
      updatedAt: nowIso()
    })
    await updateProductTimestamp(db, product.id)

    if (previousAssetId && previousAssetId !== asset.id) {
      const previousAsset = await db
        .select()
        .from(productAssets)
        .where(eq(productAssets.id, previousAssetId))
        .get()
      if (previousAsset) {
        await c.env.CUSTOMIZATION_ASSETS.delete(previousAsset.objectKey)
        await db.delete(productAssets).where(eq(productAssets.id, previousAsset.id))
      }
    }

    const nextProduct = await readProduct(c, db, product.id)
    return c.json({ item: nextProduct }, 200)
  })
  .put('/:id/variants/:variantId/media', async (c) => {
    const params = parseParams(c, variantParamsSchema)
    if (!params.success) return params.response

    const parsed = await parseJson(c, variantMediaSchema)
    if (!parsed.success) return parsed.response

    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')

    const variant = product.variants.find((item) => item.id === params.output.variantId)
    if (!variant) return jsonError(c, 404, 'Variant not found')

    const assetIds = [...new Set(parsed.output.items.map((item) => item.assetId))]
    const assetLookup = await loadProductAssetsById(db, assetIds)
    if (assetLookup.size !== assetIds.length) {
      return jsonError(c, 404, 'One or more variant media assets were not found')
    }

    if (product.status === 'published' && product.customization?.enabled) {
      const candidate = {
        ...product,
        variants: product.variants.map((item) =>
          item.id === variant.id
            ? {
                ...item,
                media: assetIds.map((assetId, index) => {
                  const asset = assetLookup.get(assetId)!
                  return {
                    id: asset.id,
                    fileName: asset.fileName,
                    mimeType: asset.mimeType,
                    widthPx: asset.widthPx,
                    heightPx: asset.heightPx,
                    byteSize: asset.byteSize,
                    position: index,
                    contentUrl: toAbsoluteAssetUrl(
                      c,
                      `/api/assets/products/${asset.id}/content`
                    ) as string
                  }
                })
              }
            : item
        )
      }
      const publishError = validatePublishable(
        candidate as NonNullable<Awaited<ReturnType<typeof readProduct>>>
      )
      if (publishError) return jsonError(c, 409, publishError)
    }

    await db.delete(productVariantMedia).where(eq(productVariantMedia.variantId, variant.id))
    if (assetIds.length > 0) {
      await db.insert(productVariantMedia).values(
        assetIds.map((assetId, index) => ({
          variantId: variant.id,
          assetId,
          position: index
        }))
      )
    }

    await updateProductTimestamp(db, product.id)
    const nextProduct = await readProduct(c, db, product.id)
    return c.json({ item: nextProduct }, 200)
  })
