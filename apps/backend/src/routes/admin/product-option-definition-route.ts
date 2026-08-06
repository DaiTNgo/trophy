import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { upsertTranslations } from '../../lib/catalog-translation'
import { getDb } from '../../db/client'
import { productOptionValues, productOptions } from '../../db/schema'
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
  optionUpdateSchema
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

    await db
      .update(productOptions)
      .set({ title: parsed.output.title.vi })
      .where(eq(productOptions.id, option.id))
    await upsertTranslations(db, 'product_option', String(option.id), 'title', parsed.output.title)

    await updateProductTimestamp(db, params.output.id)
    return c.json({ item: await readProduct(c, db, params.output.id) }, 200)
  })
