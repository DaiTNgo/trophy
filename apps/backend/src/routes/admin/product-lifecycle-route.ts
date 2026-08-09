import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { Hono } from 'hono'
import { getDb } from '../../db/client'
import {
  productAttributes,
  productAssets,
  catalogTranslations,
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
  misaDeletionJobs,
  r2CleanupJobs,
  products
} from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseParams } from '../../lib/validation'
import { misaDeletionJobValues } from '../../lib/misa-deletion-outbox'
import { r2CleanupJobValues } from '../../lib/r2-cleanup-outbox'
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
    const assetIds = [...new Set([
      ...product.media.map((media) => media.assetId),
      ...product.variants.flatMap((variant) => [
        ...variant.media.map((media) => media.id),
        ...(variant.customizationMedia ? [variant.customizationMedia.id] : []),
      ]),
      ...(current.thumbnailAssetId ? [current.thumbnailAssetId] : []),
    ].filter((assetId): assetId is string => typeof assetId === 'string'))]
    const assets = assetIds.length > 0
      ? await db.select().from(productAssets).where(inArray(productAssets.id, assetIds))
      : []
    const storedIds = product.variants
      .filter((variant) => variant.misaSyncStatus === 'synced')
      .map((variant) => variant.misaProductId)
      .filter((value): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0)
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
    const translationDeletes = [
      ['product', [String(current.id)]],
      ['product_attribute', product.attributes.map((attribute) => String(attribute.id))],
      ['product_option', product.options.map((option) => String(option.id))],
      ['product_option_value', product.options.flatMap((option) => option.values.map((value) => String(value.id)))],
      ['product_variant', variantIds.map(String)],
      ['product_variant_attribute', product.variants.flatMap((variant) => variant.attributes.map((attribute) => String(attribute.id)))],
    ] as const
    await db.batch([
      ...(variantIds.length > 0 ? [
        db.delete(productVariantOptionValues).where(inArray(productVariantOptionValues.variantId, variantIds)),
        db.delete(productVariantAttributes).where(inArray(productVariantAttributes.variantId, variantIds)),
        db.delete(productVariantMedia).where(inArray(productVariantMedia.variantId, variantIds)),
        db.delete(productVariantCustomizationMedia).where(inArray(productVariantCustomizationMedia.variantId, variantIds)),
      ] : []),
      ...(valueIds.length > 0 ? [db.delete(productVariantOptionValues).where(inArray(productVariantOptionValues.optionValueId, valueIds))] : []),
      ...(optionIds.length > 0 ? [db.delete(productOptionValues).where(inArray(productOptionValues.optionId, optionIds))] : []),
      db.delete(productVariants).where(eq(productVariants.productId, current.id)),
      db.delete(productOptions).where(eq(productOptions.productId, current.id)),
      db.delete(productAttributes).where(eq(productAttributes.productId, current.id)),
      db.delete(productMedia).where(eq(productMedia.productId, current.id)),
      ...(assetIds.length > 0 ? [db.delete(productAssets).where(inArray(productAssets.id, assetIds))] : []),
      db.delete(productCustomizations).where(eq(productCustomizations.productId, current.id)),
      db.delete(productCategoryLinks).where(eq(productCategoryLinks.productId, current.id)),
      ...(storedIds.length > 0 ? [db.insert(misaDeletionJobs).values(misaDeletionJobValues(storedIds))] : []),
      ...(assets.length > 0 ? [db.insert(r2CleanupJobs).values(r2CleanupJobValues(assets.map((asset) => asset.objectKey)))] : []),
      ...translationDeletes.flatMap(([ownerType, ownerKeys]) => ownerKeys.length > 0
        ? [db.delete(catalogTranslations).where(and(
            eq(catalogTranslations.ownerType, ownerType),
            inArray(catalogTranslations.ownerKey, ownerKeys),
          ))]
        : []),
      db.delete(products).where(eq(products.id, current.id)),
    ] as any)
    return c.json({ deleted: true, id: current.id }, 200)
  })
