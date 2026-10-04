import { eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { upsertTranslations } from '../../lib/catalog-translation'
import { getDb } from '../../db/client'
import { productOptionValues, productOptions, productVariantOptionValues } from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseJson, parseParams } from '../../lib/validation'
import {
  ensureOptionBelongsToProduct,
  ensureProductExists,
  updateProductTimestamp,
  validateOptionTitleUniquenessForProduct
} from './product-guards'
import { readProduct } from './product-reader'
import {
  idParamsSchema,
  optionCreateSchema,
  optionParamsSchema,
  optionUpdateSchema,
  optionBulkUpdateSchema
} from './product-schemas'

export const productOptionDefinitionRoute = new Hono<AppEnv>()
  .post('/:id/options', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response

    const parsed = await parseJson(c, optionCreateSchema)
    if (!parsed.success) return parsed.response

    const db = getDb(c.env)
    const product = await ensureProductExists(db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')

    if (product.status === 'published') {
      return jsonError(
        c,
        409,
        'Published products cannot add option definitions without rebuilding variants'
      )
    }

    const uniqueTitleError = await validateOptionTitleUniquenessForProduct(
      db,
      product.id,
      parsed.output.title.vi
    )
    if (uniqueTitleError) {
      return jsonError(c, uniqueTitleError.status, uniqueTitleError.error)
    }

    const currentOptions = await db
      .select({ id: productOptions.id })
      .from(productOptions)
      .where(eq(productOptions.productId, product.id))

    const insertedOption = await db
      .insert(productOptions)
      .values({
        productId: product.id,
        title: parsed.output.title.vi,
        displayType: parsed.output.displayType ?? 'text',
        position: currentOptions.length
      })
      .returning()
      .get()

    await upsertTranslations(db, 'product_option', String(insertedOption.id), 'title', parsed.output.title)

    const values = parsed.output.values ?? []
    if (values.length > 0) {
      const insertedValues = await db.insert(productOptionValues).values(
        values.map((item, index) => ({
          optionId: insertedOption.id,
          value: item.value.vi,
          colorHex: item.colorHex ?? null,
          swatchAssetId: item.swatchAssetId ?? null,
          position: index
        }))
      ).returning()

      for (let index = 0; index < insertedValues.length; index++) {
        await upsertTranslations(
          db,
          'product_option_value',
          String(insertedValues[index].id),
          'value',
          values[index].value
        )
      }
    }

    await updateProductTimestamp(db, product.id)
    return c.json({ item: await readProduct(c, db, product.id) }, 201)
  })
  .patch('/:id/options/:optionId', async (c) => {
    const params = parseParams(c, optionParamsSchema)
    if (!params.success) return params.response

    const parsed = await parseJson(c, optionUpdateSchema)
    if (!parsed.success) return parsed.response

    const db = getDb(c.env)
    const option = await ensureOptionBelongsToProduct(db, params.output.id, params.output.optionId)
    if (!option) return jsonError(c, 404, 'Option not found')

    const uniqueTitleError = await validateOptionTitleUniquenessForProduct(
      db,
      params.output.id,
      parsed.output.title.vi,
      option.id
    )
    if (uniqueTitleError) {
      return jsonError(c, uniqueTitleError.status, uniqueTitleError.error)
    }

    const updateData: { title: string; displayType?: string } = {
      title: parsed.output.title.vi
    }
    if (parsed.output.displayType !== undefined) {
      updateData.displayType = parsed.output.displayType
    }

    await db
      .update(productOptions)
      .set(updateData)
      .where(eq(productOptions.id, option.id))
    await upsertTranslations(db, 'product_option', String(option.id), 'title', parsed.output.title)

    await updateProductTimestamp(db, params.output.id)
    return c.json({ item: await readProduct(c, db, params.output.id) }, 200)
  })
  .put('/:id/options/:optionId/bulk', async (c) => {
    const params = parseParams(c, optionParamsSchema)
    if (!params.success) return params.response

    const parsed = await parseJson(c, optionBulkUpdateSchema)
    if (!parsed.success) return parsed.response

    const db = getDb(c.env)
    const product = await ensureProductExists(db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')

    const option = await ensureOptionBelongsToProduct(db, params.output.id, params.output.optionId)
    if (!option) return jsonError(c, 404, 'Option not found')

    const uniqueTitleError = await validateOptionTitleUniquenessForProduct(
      db,
      params.output.id,
      parsed.output.title.vi,
      option.id
    )
    if (uniqueTitleError) {
      return jsonError(c, uniqueTitleError.status, uniqueTitleError.error)
    }

    const { title, displayType, values } = parsed.output
    
    // Check for unique values within the request payload
    if (new Set(values.map((v) => v.value.vi.toLowerCase())).size !== values.length) {
      return jsonError(c, 409, 'Option values must be unique')
    }

    try {
      await db.transaction(async (tx) => {
        // 1. Update Option
        await tx
          .update(productOptions)
          .set({ title: title.vi, displayType })
          .where(eq(productOptions.id, option.id))
        await upsertTranslations(tx as any, 'product_option', String(option.id), 'title', title)

        // 2. Diff values
        const existingValues = await tx
          .select({ id: productOptionValues.id })
          .from(productOptionValues)
          .where(eq(productOptionValues.optionId, option.id))
        
        const existingIds = new Set(existingValues.map((v) => v.id))
        const incomingIds = new Set(values.map((v) => v.id).filter((id): id is number => id !== null))

        // Values to delete
        const toDeleteIds = [...existingIds].filter((id) => !incomingIds.has(id))

        if (toDeleteIds.length > 0) {
          // Check if any deleted value is referenced by variants
          const referenced = await tx
            .select({ variantId: productVariantOptionValues.variantId })
            .from(productVariantOptionValues)
            .where(inArray(productVariantOptionValues.optionValueId, toDeleteIds))
            .limit(1)
          
          if (referenced.length > 0) {
            throw new Error('Cannot delete an option value that is still used by variants')
          }

          await tx.delete(productOptionValues).where(inArray(productOptionValues.id, toDeleteIds))
        }

        // Values to update / create
        let position = 0
        for (const item of values) {
          if (item.id && existingIds.has(item.id)) {
            // Update
            await tx
              .update(productOptionValues)
              .set({
                value: item.value.vi,
                colorHex: item.colorHex ?? null,
                swatchAssetId: item.swatchAssetId ?? null,
                position
              })
              .where(eq(productOptionValues.id, item.id))
            await upsertTranslations(tx as any, 'product_option_value', String(item.id), 'value', item.value)
          } else {
            // Create
            const [inserted] = await tx
              .insert(productOptionValues)
              .values({
                optionId: option.id,
                value: item.value.vi,
                colorHex: item.colorHex ?? null,
                swatchAssetId: item.swatchAssetId ?? null,
                position
              })
              .returning()
            await upsertTranslations(tx as any, 'product_option_value', String(inserted.id), 'value', item.value)
          }
          position++
        }

        await updateProductTimestamp(tx as any, product.id)
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Cannot delete an option value that is still used by variants') {
        return jsonError(c, 409, error.message)
      }
      throw error
    }

    return c.json({ item: await readProduct(c, db, product.id) }, 200)
  })
