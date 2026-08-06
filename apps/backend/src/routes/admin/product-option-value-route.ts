import { eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { upsertTranslations } from '../../lib/catalog-translation'
import { getDb } from '../../db/client'
import {
  productOptionValues,
  productOptions,
  productVariantOptionValues,
  productVariants
} from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseJson, parseParams } from '../../lib/validation'
import {
  ensureOptionBelongsToProduct,
  ensureOptionValueBelongsToProduct,
  ensureProductExists,
  updateProductTimestamp,
  validateOptionValueUniquenessForOption
} from './product-guards'
import { readProduct } from './product-reader'
import {
  optionParamsSchema,
  optionValueCreateSchema,
  optionValueParamsSchema,
  optionValueUpdateSchema
} from './product-schemas'

export const productOptionValueRoute = new Hono<AppEnv>()
  .delete('/:id/options/:optionId', async (c) => {
    const params = parseParams(c, optionParamsSchema)
    if (!params.success) return params.response

    const db = getDb(c.env)
    const product = await ensureProductExists(db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')

    if (product.status === 'published') {
      return jsonError(
        c,
        409,
        'Published products cannot delete option definitions without rebuilding variants'
      )
    }

    const option = await ensureOptionBelongsToProduct(db, params.output.id, params.output.optionId)
    if (!option) return jsonError(c, 404, 'Option not found')

    const optionValueRows = await db
      .select({ id: productOptionValues.id })
      .from(productOptionValues)
      .where(eq(productOptionValues.optionId, option.id))
    const optionValueIds = optionValueRows.map((row) => row.id)

    if (optionValueIds.length > 0) {
      const referenced = await db
        .select({ variantId: productVariantOptionValues.variantId })
        .from(productVariantOptionValues)
        .where(inArray(productVariantOptionValues.optionValueId, optionValueIds))
        .get()
      if (referenced) {
        return jsonError(c, 409, 'Cannot delete an option that is still used by variants')
      }
    }

    const currentVariants = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.productId, product.id))
    const currentOptions = await db
      .select({ id: productOptions.id })
      .from(productOptions)
      .where(eq(productOptions.productId, product.id))

    if (currentOptions.length === 1 && currentVariants.length > 1) {
      return jsonError(
        c,
        409,
        'Cannot disable variant options while the product still has multiple variants'
      )
    }

    if (optionValueIds.length > 0) {
      await db.delete(productOptionValues).where(inArray(productOptionValues.id, optionValueIds))
    }
    await db.delete(productOptions).where(eq(productOptions.id, option.id))
    await updateProductTimestamp(db, product.id)

    if (currentOptions.length === 1 && currentVariants.length === 1) {
      await db
        .update(productVariants)
        .set({
          isDefault: true,
          position: 0,
          updatedAt: new Date().toISOString()
        })
        .where(eq(productVariants.id, currentVariants[0].id))
    }

    return c.json({ item: await readProduct(c, db, product.id) }, 200)
  })
  .post('/:id/options/:optionId/values', async (c) => {
    const params = parseParams(c, optionParamsSchema)
    if (!params.success) return params.response

    const parsed = await parseJson(c, optionValueCreateSchema)
    if (!parsed.success) return parsed.response

    const db = getDb(c.env)
    const option = await ensureOptionBelongsToProduct(db, params.output.id, params.output.optionId)
    if (!option) return jsonError(c, 404, 'Option not found')

    const uniqueValueError = await validateOptionValueUniquenessForOption(
      db,
      option.id,
      parsed.output.value.vi
    )
    if (uniqueValueError) {
      return jsonError(c, uniqueValueError.status, uniqueValueError.error)
    }

    const existingValues = await db
      .select({ id: productOptionValues.id })
      .from(productOptionValues)
      .where(eq(productOptionValues.optionId, option.id))
    const insertedValue = await db
      .insert(productOptionValues)
      .values({
        optionId: option.id,
        value: parsed.output.value.vi,
        position: existingValues.length
      })
      .returning()
      .get()

    await upsertTranslations(
      db,
      'product_option_value',
      String(insertedValue.id),
      'value',
      parsed.output.value
    )
    await updateProductTimestamp(db, params.output.id)

    return c.json({ item: await readProduct(c, db, params.output.id) }, 201)
  })
  .patch('/:id/option-values/:valueId', async (c) => {
    const params = parseParams(c, optionValueParamsSchema)
    if (!params.success) return params.response

    const parsed = await parseJson(c, optionValueUpdateSchema)
    if (!parsed.success) return parsed.response

    const db = getDb(c.env)
    const optionValue = await ensureOptionValueBelongsToProduct(db, params.output.id, params.output.valueId)
    if (!optionValue) return jsonError(c, 404, 'Option value not found')

    const uniqueValueError = await validateOptionValueUniquenessForOption(
      db,
      optionValue.optionId,
      parsed.output.value.vi,
      optionValue.id
    )
    if (uniqueValueError) {
      return jsonError(c, uniqueValueError.status, uniqueValueError.error)
    }

    await db
      .update(productOptionValues)
      .set({ value: parsed.output.value.vi })
      .where(eq(productOptionValues.id, optionValue.id))
    await upsertTranslations(
      db,
      'product_option_value',
      String(optionValue.id),
      'value',
      parsed.output.value
    )
    await updateProductTimestamp(db, params.output.id)

    return c.json({ item: await readProduct(c, db, params.output.id) }, 200)
  })
  .delete('/:id/option-values/:valueId', async (c) => {
    const params = parseParams(c, optionValueParamsSchema)
    if (!params.success) return params.response

    const db = getDb(c.env)
    const optionValue = await ensureOptionValueBelongsToProduct(db, params.output.id, params.output.valueId)
    if (!optionValue) return jsonError(c, 404, 'Option value not found')

    const referenced = await db
      .select({ variantId: productVariantOptionValues.variantId })
      .from(productVariantOptionValues)
      .where(eq(productVariantOptionValues.optionValueId, optionValue.id))
      .get()
    if (referenced) {
      return jsonError(c, 409, 'Cannot delete an option value that is still used by variants')
    }

    await db.delete(productOptionValues).where(eq(productOptionValues.id, optionValue.id))
    await updateProductTimestamp(db, params.output.id)

    return c.json({ item: await readProduct(c, db, params.output.id) }, 200)
  })
