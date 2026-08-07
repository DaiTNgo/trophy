import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { getDb } from '../../db/client'
import { products } from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseJson, parseParams } from '../../lib/validation'
import { replaceAttributes, replaceMedia } from './product-mutations'
import { readProduct } from './product-reader'
import { attributesSchema, idParamsSchema, mediaSchema } from './product-schemas'

export const productContentRoute = new Hono<AppEnv>()
  .put('/:id/attributes', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response

    const parsed = await parseJson(c, attributesSchema)
    if (!parsed.success) return parsed.response

    const db = getDb(c.env)
    const exists = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, params.output.id))
      .get()
    if (!exists) return jsonError(c, 404, 'Product not found')

    await replaceAttributes(db, params.output.id, parsed.output.items)
    await db
      .update(products)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(products.id, params.output.id))

    return c.json({ item: await readProduct(c, db, params.output.id) }, 200)
  })
  .put('/:id/media', async (c) => {
    const params = parseParams(c, idParamsSchema)
    if (!params.success) return params.response

    const parsed = await parseJson(c, mediaSchema)
    if (!parsed.success) return parsed.response

    const db = getDb(c.env)
    const exists = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, params.output.id))
      .get()
    if (!exists) return jsonError(c, 404, 'Product not found')

    await replaceMedia(db, params.output.id, parsed.output.items)
    await db
      .update(products)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(products.id, params.output.id))

    return c.json({ item: await readProduct(c, db, params.output.id) }, 200)
  })
