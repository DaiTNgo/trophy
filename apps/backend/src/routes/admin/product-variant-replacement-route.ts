import { Hono } from 'hono'
import { getDb } from '../../db/client'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseJson, parseParams } from '../../lib/validation'
import { ensureVariantAssetIdsExist, updateProductTimestamp } from './product-guards'
import { readProduct } from './product-reader'
import { validatePublishable } from './product-publishability'
import { replaceVariants } from './product-variant-mutations'
import { idParamsSchema, variantsSchema } from './product-schemas'

// Legacy full-replace variant editor. Product detail uses operation-specific variant routes.
export const productVariantReplacementRoute = new Hono<AppEnv>()
  .put('/:id/variants', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response

    const parsed = await parseJson(c, variantsSchema)
    if (!parsed.success) return parsed.response

    const db = getDb(c.env)
    const existingProduct = await readProduct(c, db, params.output.id)
    if (!existingProduct) return jsonError(c, 404, 'Product not found')

    if (existingProduct.status === 'published' && existingProduct.customization?.enabled) {
      const candidateVariants = parsed.output.items.map((item, index) => ({
        id: item.id ?? -1,
        title: item.title,
        sku: item.sku,
        priceAmount: item.priceAmount ?? null,
        inventoryQuantity: item.inventoryQuantity ?? 0,
        allowBackorder: item.allowBackorder ?? false,
        isDefault: item.isDefault ?? false,
        position: index,
        options: [],
        media: item.media ?? []
      }))

      const publishError = validatePublishable({
        ...existingProduct,
        variants: candidateVariants
      } as any)
      if (publishError) return jsonError(c, 409, publishError)
    }

    const allAssetIds = [
      ...new Set(
        parsed.output.items.flatMap((variant) => [
          ...(variant.media ?? []).map((media) => media.assetId),
          ...(variant.customizationMedia?.assetId ? [variant.customizationMedia.assetId] : [])
        ])
      )
    ]
    const missingAssets = await ensureVariantAssetIdsExist(db, allAssetIds)
    if (missingAssets) return jsonError(c, missingAssets.status, missingAssets.error)

    const replaceError = await replaceVariants(db, params.output.id, parsed.output.items)
    if (replaceError) return jsonError(c, replaceError.status, replaceError.error)

    await updateProductTimestamp(db, params.output.id)
    return c.json({ item: await readProduct(c, db, params.output.id) }, 200)
  })
