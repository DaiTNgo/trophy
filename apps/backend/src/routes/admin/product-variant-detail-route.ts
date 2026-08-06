import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { upsertTranslations } from '../../lib/catalog-translation'
import { getDb } from '../../db/client'
import { productVariantOptionValues, productVariants } from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseJson, parseParams } from '../../lib/validation'
import {
  ensureProductExists,
  ensureVariantBelongsToProduct,
  updateProductTimestamp
} from './product-guards'
import { syncMisaProductVariants } from './product-misa-sync'
import { replaceVariantAttributes } from './product-mutations'
import { readProduct } from './product-reader'
import { validateVariantSelectionForProduct } from './product-variant-selection'
import { variantDetailSchema, variantParamsSchema } from './product-schemas'

const localizedInputValue = (value: string | { vi: string }) =>
  typeof value === 'string' ? value : value.vi

const defaultLocalizedText = (value: string) => ({ vi: value, en: value })

export const productVariantDetailRoute = new Hono<AppEnv>()
  .patch('/:id/variants/:variantId', async (c) => {
    const params = parseParams(c, variantParamsSchema)
    if (!params.success) return params.response

    const parsed = await parseJson(c, variantDetailSchema)
    if (!parsed.success) return parsed.response

    const db = getDb(c.env)
    const product = await ensureProductExists(db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')

    const variant = await ensureVariantBelongsToProduct(db, product.id, params.output.variantId)
    if (!variant) return jsonError(c, 404, 'Variant not found')

    const currentOptionRows = await db
      .select({ optionValueId: productVariantOptionValues.optionValueId })
      .from(productVariantOptionValues)
      .where(eq(productVariantOptionValues.variantId, variant.id))
    const nextOptionValueIds = parsed.output.optionValueIds
      ? [...new Set(parsed.output.optionValueIds)].sort((a, b) => a - b)
      : currentOptionRows.map((row) => row.optionValueId).sort((a, b) => a - b)

    const selectionError = await validateVariantSelectionForProduct({
      db,
      productId: product.id,
      optionValueIds: nextOptionValueIds,
      excludedVariantId: variant.id
    })
    if (selectionError) return jsonError(c, selectionError.status, selectionError.error)

    const nextVariantTitle = localizedInputValue(parsed.output.title)
    await db
      .update(productVariants)
      .set({
        title: nextVariantTitle,
        sku: parsed.output.sku ?? null,
        allowBackorder: parsed.output.allowBackorder ?? variant.allowBackorder,
        updatedAt: new Date().toISOString()
      })
      .where(eq(productVariants.id, variant.id))
    await upsertTranslations(
      db,
      'product_variant',
      String(variant.id),
      'title',
      typeof parsed.output.title === 'string'
        ? defaultLocalizedText(parsed.output.title)
        : parsed.output.title
    )

    if (parsed.output.optionValueIds !== undefined) {
      await db.delete(productVariantOptionValues).where(eq(productVariantOptionValues.variantId, variant.id))
      if (nextOptionValueIds.length > 0) {
        await db.insert(productVariantOptionValues).values(
          nextOptionValueIds.map((optionValueId) => ({ variantId: variant.id, optionValueId }))
        )
      }
    }
    if (parsed.output.attributes !== undefined) {
      await replaceVariantAttributes(db, variant.id, parsed.output.attributes)
    }

    await updateProductTimestamp(db, product.id)
    const nextProduct = await readProduct(c, db, product.id)
    if (nextProduct && product.status === 'published' && nextVariantTitle !== variant.title) {
      const updated = nextProduct.variants.find((item) => item.id === variant.id)
      if (updated) await syncMisaProductVariants(c, db, nextProduct, [updated])
    }
    const syncedProduct = product.status === 'published' && nextVariantTitle !== variant.title
      ? await readProduct(c, db, product.id)
      : nextProduct
    return c.json({ item: syncedProduct }, 200)
  })
