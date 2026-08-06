import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { getDb } from '../../db/client'
import { productVariants } from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseJson, parseParams } from '../../lib/validation'
import { ensureProductExists, updateProductTimestamp } from './product-guards'
import { readProduct } from './product-reader'
import { idParamsSchema, priceUpdateSchema, stockUpdateSchema } from './product-schemas'

async function existingVariantIds(db: ReturnType<typeof getDb>, productId: number) {
  return new Set(
    (
      await db
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(eq(productVariants.productId, productId))
    ).map((row) => row.id)
  )
}

export const productVariantBatchRoute = new Hono<AppEnv>()
  .patch('/:id/variants/prices', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response
    const parsed = await parseJson(c, priceUpdateSchema)
    if (!parsed.success) return parsed.response

    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')

    const variantIds = parsed.output.items.map((item) => item.id)
    if (new Set(variantIds).size !== variantIds.length) {
      return jsonError(c, 409, 'Variant ids in a price update must be unique')
    }
    if (product.status === 'published' && parsed.output.items.some((item) => item.priceAmount === null)) {
      return jsonError(c, 409, 'Every variant must have a price before publish')
    }
    const knownVariantIds = await existingVariantIds(db, product.id)
    if (variantIds.some((variantId) => !knownVariantIds.has(variantId))) {
      return jsonError(c, 404, 'One or more variants were not found')
    }

    for (const item of parsed.output.items) {
      await db
        .update(productVariants)
        .set({ priceAmount: item.priceAmount, updatedAt: new Date().toISOString() })
        .where(and(eq(productVariants.id, item.id), eq(productVariants.productId, product.id)))
    }
    await updateProductTimestamp(db, product.id)
    return c.json({ item: await readProduct(c, db, product.id) }, 200)
  })
  .patch('/:id/variants/stock', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response
    const parsed = await parseJson(c, stockUpdateSchema)
    if (!parsed.success) return parsed.response

    const db = getDb(c.env)
    const product = await ensureProductExists(db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')

    const variantIds = parsed.output.items.map((item) => item.id)
    if (new Set(variantIds).size !== variantIds.length) {
      return jsonError(c, 409, 'Variant ids in a stock update must be unique')
    }
    const knownVariantIds = await existingVariantIds(db, product.id)
    if (variantIds.some((variantId) => !knownVariantIds.has(variantId))) {
      return jsonError(c, 404, 'One or more variants were not found')
    }

    for (const item of parsed.output.items) {
      await db
        .update(productVariants)
        .set({ inventoryQuantity: item.inventoryQuantity, updatedAt: new Date().toISOString() })
        .where(and(eq(productVariants.id, item.id), eq(productVariants.productId, product.id)))
    }
    await updateProductTimestamp(db, product.id)
    return c.json({ item: await readProduct(c, db, product.id) }, 200)
  })
