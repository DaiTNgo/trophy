import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { Hono } from 'hono'
import { getDb } from '../../db/client'
import {
  productAttributes,
  productCategoryLinks,
  productCustomizations,
  productMedia,
  productOptionValues,
  productOptions,
  productVariantAttributes,
  productVariantCustomizationMedia,
  productVariantMedia,
  productVariantOptionValues,
  productVariants,
  products
} from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseParams } from '../../lib/validation'
import { deleteMisaProducts, isMisaConfigured } from '../../lib/misa'
import { syncMisaProductVariants } from './product-misa-sync'
import { validatePublishable } from './product-publishability'
import { readProduct } from './product-reader'
import { idParamsSchema } from './product-schemas'

const nowIso = () => new Date().toISOString()

export const productLifecycleRoute = new Hono<AppEnv>()
  .post('/:id/publish', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response

    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')

    const publishError = validatePublishable(product)
    if (publishError) return jsonError(c, 409, publishError)

    await db
      .update(products)
      .set({ status: 'published', updatedAt: nowIso() })
      .where(eq(products.id, product.id))

    await syncMisaProductVariants(c, db, product)
    return c.json({ item: await readProduct(c, db, product.id) }, 200)
  })
  .post('/:id/archive', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response

    const db = getDb(c.env)
    const current = await db.select().from(products).where(eq(products.id, params.output.id)).get()
    if (!current) return jsonError(c, 404, 'Product not found')

    await db
      .update(products)
      .set({ status: 'archived', updatedAt: nowIso() })
      .where(eq(products.id, current.id))

    return c.json({ item: await readProduct(c, db, current.id) }, 200)
  })
  .delete('/:id', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response

    const db = getDb(c.env)
    const current = await db
      .select()
      .from(products)
      .where(and(eq(products.id, params.output.id), isNull(products.deletedAt)))
      .get()
    if (!current) return jsonError(c, 404, 'Product not found')

    const deletedAt = nowIso()
    await db
      .update(products)
      .set({ deletedAt, updatedAt: deletedAt })
      .where(eq(products.id, current.id))

    return c.json({ item: await readProduct(c, db, current.id, { includeTrashed: true }) }, 200)
  })
  .post('/:id/restore', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response

    const db = getDb(c.env)
    const current = await db
      .select()
      .from(products)
      .where(and(eq(products.id, params.output.id), isNotNull(products.deletedAt)))
      .get()
    if (!current) return jsonError(c, 404, 'Product not found')

    await db
      .update(products)
      .set({ deletedAt: null, status: 'draft', updatedAt: nowIso() })
      .where(eq(products.id, current.id))

    return c.json({ item: await readProduct(c, db, current.id) }, 200)
  })
  .delete('/:id/permanent', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response

    const db = getDb(c.env)
    const current = await db
      .select()
      .from(products)
      .where(and(eq(products.id, params.output.id), isNotNull(products.deletedAt)))
      .get()
    if (!current) return jsonError(c, 404, 'Product not found')

    const product = await readProduct(c, db, current.id, { includeTrashed: true })
    if (!product) return jsonError(c, 404, 'Product not found')
    const storedIds = product.variants
      .filter((variant) => variant.misaSyncStatus === 'synced')
      .map((variant) => variant.misaProductId)
      .filter((value): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0)
    if (storedIds.length > 0) {
      if (!isMisaConfigured(c.env)) return jsonError(c, 503, 'MISA integration is not configured')
      try {
        await deleteMisaProducts(c.env, storedIds)
      } catch (error) {
        return jsonError(c, 502, error instanceof Error ? error.message : 'Unable to delete MISA products')
      }
    }

    const optionRows = await db
      .select({ id: productOptions.id })
      .from(productOptions)
      .where(eq(productOptions.productId, current.id))
    const optionIds = optionRows.map((row) => row.id)
    const valueRows = optionIds.length > 0
      ? await db.select({ id: productOptionValues.id }).from(productOptionValues).where(inArray(productOptionValues.optionId, optionIds))
      : []
    const valueIds = valueRows.map((row) => row.id)
    const variantIds = product.variants.map((variant) => variant.id)
    if (variantIds.length > 0) {
      await db.delete(productVariantOptionValues).where(inArray(productVariantOptionValues.variantId, variantIds))
      await db.delete(productVariantAttributes).where(inArray(productVariantAttributes.variantId, variantIds))
      await db.delete(productVariantMedia).where(inArray(productVariantMedia.variantId, variantIds))
      await db.delete(productVariantCustomizationMedia).where(inArray(productVariantCustomizationMedia.variantId, variantIds))
    }
    if (valueIds.length > 0) await db.delete(productVariantOptionValues).where(inArray(productVariantOptionValues.optionValueId, valueIds))
    if (optionIds.length > 0) await db.delete(productOptionValues).where(inArray(productOptionValues.optionId, optionIds))
    await db.delete(productVariants).where(eq(productVariants.productId, current.id))
    await db.delete(productOptions).where(eq(productOptions.productId, current.id))
    await db.delete(productAttributes).where(eq(productAttributes.productId, current.id))
    await db.delete(productMedia).where(eq(productMedia.productId, current.id))
    await db.delete(productCustomizations).where(eq(productCustomizations.productId, current.id))
    await db.delete(productCategoryLinks).where(eq(productCategoryLinks.productId, current.id))
    await db.delete(products).where(eq(products.id, current.id))
    return c.json({ deleted: true, id: current.id }, 200)
  })
